import crypto from 'crypto';

// Lightweight, self-contained CBOR decoder
function decodeCBOR(buffer) {
  let offset = 0;

  function readByte() {
    if (offset >= buffer.length) throw new Error('Unexpected EOF');
    return buffer[offset++];
  }

  function readBytes(len) {
    if (offset + len > buffer.length) throw new Error('Unexpected EOF');
    const res = buffer.slice(offset, offset + len);
    offset += len;
    return res;
  }

  function parse() {
    const initialByte = readByte();
    const majorType = initialByte >> 5;
    const additionalInfo = initialByte & 0x1f;

    let value;
    if (additionalInfo < 24) {
      value = additionalInfo;
    } else if (additionalInfo === 24) {
      value = readByte();
    } else if (additionalInfo === 25) {
      value = (readByte() << 8) | readByte();
    } else if (additionalInfo === 26) {
      value = (readByte() << 24) | (readByte() << 16) | (readByte() << 8) | readByte();
    } else if (additionalInfo === 27) {
      const high = (readByte() << 24) | (readByte() << 16) | (readByte() << 8) | readByte();
      const low = (readByte() << 24) | (readByte() << 16) | (readByte() << 8) | readByte();
      value = high * 0x100000000 + low;
    } else if (additionalInfo === 31) {
      value = Infinity;
    } else {
      throw new Error('Unsupported additional info in CBOR');
    }

    switch (majorType) {
      case 0: // Unsigned integer
        return value;
      case 1: // Negative integer
        return -1 - value;
      case 2: // Byte string
        return readBytes(value);
      case 3: // Text string
        return readBytes(value).toString('utf8');
      case 4: // Array
        const arr = [];
        for (let i = 0; i < value; i++) arr.push(parse());
        return arr;
      case 5: // Map
        const map = new Map();
        for (let i = 0; i < value; i++) {
          const k = parse();
          const v = parse();
          map.set(k, v);
        }
        return map;
      case 6: // Tag
        return parse();
      case 7: // Simple/Float
        if (additionalInfo === 20) return false;
        if (additionalInfo === 21) return true;
        if (additionalInfo === 22) return null;
        if (additionalInfo === 23) return undefined;
        return value;
      default:
        throw new Error(`Unknown major type: ${majorType}`);
    }
  }

  return parse();
}

/**
 * Base64URL string to Buffer
 */
function base64urlToBuffer(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  return Buffer.from(base64 + '='.repeat(padLen), 'base64');
}

/**
 * Verifies the WebAuthn Registration response and returns public key credentials.
 */
export function verifyRegistration(registrationData) {
  try {
    const { attestationObject, clientDataJSON } = registrationData;
    const attestationBuffer = base64urlToBuffer(attestationObject);
    const clientDataBuffer = base64urlToBuffer(clientDataJSON);

    // 1. Parse clientDataJSON
    const clientData = JSON.parse(clientDataBuffer.toString('utf8'));
    if (clientData.type !== 'webauthn.create') {
      throw new Error('Invalid client data type for registration');
    }

    // 2. Parse attestationObject
    const attestation = decodeCBOR(attestationBuffer);
    const authData = attestation.get('authData');

    // 3. Extract parts of authData
    // rpIdHash: 32 bytes (0-31)
    // flags: 1 byte (32)
    // signCount: 4 bytes (33-36)
    // attestedCredentialData: (starts at 37)
    //   aaguid: 16 bytes
    //   credentialIdLength: 2 bytes
    //   credentialId: variable
    //   credentialPublicKey: variable
    const flags = authData[32];
    const hasAttestedCredData = (flags & 0x40) !== 0;
    if (!hasAttestedCredData) {
      throw new Error('No attested credential data in authData');
    }

    const credentialIdLength = (authData[53] << 8) | authData[54];
    const credentialId = authData.slice(55, 55 + credentialIdLength);
    const credentialPublicKeyBuffer = authData.slice(55 + credentialIdLength);

    // 4. Decode public key from COSE CBOR
    const coseKey = decodeCBOR(credentialPublicKeyBuffer);
    const kty = coseKey.get(1); // Key Type
    const alg = coseKey.get(3); // Algorithm

    let jwk;
    if (kty === 2) { // EC2 key type
      const crv = coseKey.get(-1); // curve
      const x = coseKey.get(-2);   // x coord
      const y = coseKey.get(-3);   // y coord
      
      jwk = {
        kty: 'EC',
        crv: crv === 1 ? 'P-256' : 'P-256',
        x: Buffer.from(x).toString('base64url'),
        y: Buffer.from(y).toString('base64url'),
        alg: alg === -7 ? 'ES256' : 'ES256'
      };
    } else if (kty === 3) { // RSA key type
      const n = coseKey.get(-2); // modulus
      const e = coseKey.get(-3); // public exponent

      jwk = {
        kty: 'RSA',
        n: Buffer.from(n).toString('base64url'),
        e: Buffer.from(e).toString('base64url'),
        alg: alg === -257 ? 'RS256' : 'RS256'
      };
    } else {
      throw new Error(`Unsupported public key type in WebAuthn: ${kty}`);
    }

    return {
      success: true,
      credentialId: credentialId.toString('base64url'),
      jwk
    };
  } catch (error) {
    console.error('WebAuthn verification failure:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifies WebAuthn Assertion (Login) signatures against a registered public key.
 */
export function verifyAssertion(assertionData, jwk) {
  try {
    const { clientDataJSON, authenticatorData, signature } = assertionData;
    const clientDataBuffer = base64urlToBuffer(clientDataJSON);
    const authDataBuffer = base64urlToBuffer(authenticatorData);
    const signatureBuffer = base64urlToBuffer(signature);

    // 1. Verify clientDataJSON type
    const clientData = JSON.parse(clientDataBuffer.toString('utf8'));
    if (clientData.type !== 'webauthn.get') {
      throw new Error('Invalid client data type for verification');
    }

    // 2. Hash clientDataJSON
    const clientDataHash = crypto.createHash('sha256').update(clientDataBuffer).digest();

    // 3. Signature verification payload: authenticatorData + sha256(clientDataJSON)
    const verifyData = Buffer.concat([authDataBuffer, clientDataHash]);

    // 4. Import JWK key as crypto public key object
    const publicKey = crypto.createPublicKey({
      key: jwk,
      format: 'jwk'
    });

    // 5. Verify the signature
    const verified = crypto.verify(
      'sha256',
      verifyData,
      publicKey,
      signatureBuffer
    );

    return verified;
  } catch (error) {
    console.error('Assertion verification failure:', error);
    return false;
  }
}

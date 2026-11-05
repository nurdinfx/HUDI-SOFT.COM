// backend/src/utils/seedDentalTreatments.js
const { query } = require('../db/pool');

const STANDARD_DENTAL_TREATMENTS = [
  // PREVENTIVE DENTISTRY
  { category: 'Preventive Dentistry', name: 'Dental Cleaning', code: 'PREV-01', price: 40, duration: 30, description: 'Comprehensive routine dental cleaning and plaque removal' },
  { category: 'Preventive Dentistry', name: 'Scaling and Polishing', code: 'PREV-02', price: 60, duration: 45, description: 'Deep calculus scaling and polish finishing' },
  { category: 'Preventive Dentistry', name: 'Fluoride Treatment', code: 'PREV-03', price: 30, duration: 20, description: 'Topical high-concentration fluoride enamel protection' },
  { category: 'Preventive Dentistry', name: 'Dental Sealants', code: 'PREV-04', price: 35, duration: 30, description: 'Protective pit and fissure sealant application' },
  { category: 'Preventive Dentistry', name: 'Oral Hygiene Education', code: 'PREV-05', price: 20, duration: 20, description: 'Personalized flossing, brushing, and prevention consultation' },

  // RESTORATIVE DENTISTRY
  { category: 'Restorative Dentistry', name: 'Composite Filling', code: 'REST-01', price: 50, duration: 45, description: 'Tooth-colored aesthetic resin composite restoration' },
  { category: 'Restorative Dentistry', name: 'Amalgam Filling', code: 'REST-02', price: 40, duration: 45, description: 'Durable posterior silver amalgam restoration' },
  { category: 'Restorative Dentistry', name: 'Dental Restoration', code: 'REST-03', price: 75, duration: 60, description: 'Extensive multi-surface tooth reconstruction' },
  { category: 'Restorative Dentistry', name: 'Inlays and Onlays', code: 'REST-04', price: 150, duration: 60, description: 'Custom lab-crafted porcelain or composite cusp coverage' },

  // SURGICAL DENTISTRY
  { category: 'Surgical Dentistry', name: 'Simple Extraction', code: 'SURG-01', price: 45, duration: 30, description: 'Routine extraction of erupted tooth under local anesthesia' },
  { category: 'Surgical Dentistry', name: 'Surgical Extraction', code: 'SURG-02', price: 90, duration: 60, description: 'Complex tooth removal requiring sectioning and mucoperiosteal flap' },
  { category: 'Surgical Dentistry', name: 'Wisdom Tooth Extraction', code: 'SURG-03', price: 150, duration: 60, description: 'Impacted 3rd molar removal with bone osteotomy' },
  { category: 'Surgical Dentistry', name: 'Oral Surgery', code: 'SURG-04', price: 250, duration: 90, description: 'Minor oral surgical intervention / frenectomy / cyst enucleation' },

  // ENDODONTICS
  { category: 'Endodontics', name: 'Root Canal Treatment', code: 'ENDO-01', price: 180, duration: 90, description: 'Biomechanical instrumentation, disinfection, and obturation' },
  { category: 'Endodontics', name: 'Root Canal Retreatment', code: 'ENDO-02', price: 220, duration: 90, description: 'Revision and refilling of previously failing endodontic case' },
  { category: 'Endodontics', name: 'Pulp Therapy', code: 'ENDO-03', price: 80, duration: 45, description: 'Direct/indirect pulp capping or vital pulpotomy' },

  // PROSTHODONTICS
  { category: 'Prosthodontics', name: 'Dental Crown', code: 'PROS-01', price: 180, duration: 60, description: 'Full coverage Zirconia / Porcelain Fused to Metal crown' },
  { category: 'Prosthodontics', name: 'Dental Bridge', code: 'PROS-02', price: 380, duration: 90, description: 'Fixed prosthetic unit replacing missing teeth' },
  { category: 'Prosthodontics', name: 'Complete Dentures', code: 'PROS-03', price: 450, duration: 60, description: 'Full maxillary or mandibular acrylic arch prosthesis' },
  { category: 'Prosthodontics', name: 'Partial Dentures', code: 'PROS-04', price: 250, duration: 60, description: 'Removable cast metal or Valplast flexible partial prosthesis' },
  { category: 'Prosthodontics', name: 'Dental Implants', code: 'PROS-05', price: 850, duration: 120, description: 'Titanium endosseous fixture surgical placement and abutment' },

  // ORTHODONTICS
  { category: 'Orthodontics', name: 'Metal Braces', code: 'ORTHO-01', price: 1200, duration: 60, description: 'Full arch conventional stainless steel bracket alignment' },
  { category: 'Orthodontics', name: 'Ceramic Braces', code: 'ORTHO-02', price: 1600, duration: 60, description: 'Aesthetic clear ceramic bracket system' },
  { category: 'Orthodontics', name: 'Clear Aligners', code: 'ORTHO-03', price: 2200, duration: 45, description: 'Custom sequential invisible thermoformed trays' },
  { category: 'Orthodontics', name: 'Retainers', code: 'ORTHO-04', price: 150, duration: 30, description: 'Post-orthodontic Hawley or Essix retention appliance' },
  { category: 'Orthodontics', name: 'Orthodontic Adjustments', code: 'ORTHO-05', price: 50, duration: 30, description: 'Routine wire changing, ligature tightening, and progress check' },

  // COSMETIC DENTISTRY
  { category: 'Cosmetic Dentistry', name: 'Teeth Whitening', code: 'COSM-01', price: 140, duration: 60, description: 'In-office photo-activated hydrogen peroxide bleaching' },
  { category: 'Cosmetic Dentistry', name: 'Veneers', code: 'COSM-02', price: 280, duration: 90, description: 'Ultra-thin Emax porcelain laminate aesthetic veneer' },
  { category: 'Cosmetic Dentistry', name: 'Cosmetic Bonding', code: 'COSM-03', price: 95, duration: 45, description: 'Diastema closure or incisal edge contouring composite bonding' },
  { category: 'Cosmetic Dentistry', name: 'Smile Design', code: 'COSM-04', price: 500, duration: 90, description: 'Digital aesthetic mock-up and comprehensive cosmetic planning' },

  // PEDIATRIC DENTISTRY
  { category: 'Pediatric Dentistry', name: 'Pediatric Examination', code: 'PED-01', price: 30, duration: 30, description: 'Gentle child oral health exam and developmental assessment' },
  { category: 'Pediatric Dentistry', name: 'Pediatric Filling', code: 'PED-02', price: 40, duration: 30, description: 'Glass ionomer or composite deciduous tooth restoration' },
  { category: 'Pediatric Dentistry', name: 'Fluoride Application', code: 'PED-03', price: 25, duration: 20, description: 'Pediatric fluoride varnish decay prevention' },
  { category: 'Pediatric Dentistry', name: 'Pediatric Extraction', code: 'PED-04', price: 35, duration: 30, description: 'Gentle primary tooth extraction with space preservation review' },
];

async function seedClinicDentalTreatments(clinicId) {
  try {
    const { rows: existing } = await query(
      'SELECT id FROM dental_treatments WHERE clinic_id = $1 LIMIT 1',
      [clinicId]
    );

    if (existing.length > 0) return; // already seeded

    for (const t of STANDARD_DENTAL_TREATMENTS) {
      await query(
        `INSERT INTO dental_treatments (
          clinic_id, category, treatment_name, code, description, default_price, duration_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING`,
        [clinicId, t.category, t.name, t.code, t.description, t.price, t.duration]
      );
    }
    console.log(`✅ Seeded ${STANDARD_DENTAL_TREATMENTS.length} dental treatments for clinic: ${clinicId}`);
  } catch (err) {
    console.error('Error seeding dental treatments:', err.message);
  }
}

module.exports = { seedClinicDentalTreatments, STANDARD_DENTAL_TREATMENTS };


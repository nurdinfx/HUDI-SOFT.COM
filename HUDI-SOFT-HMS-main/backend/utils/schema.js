const db = require('../database');

async function tableExists(tableName) {
    const result = await db.query(`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
        ) AS exists
    `, [tableName]);
    return !!result.rows[0]?.exists;
}

async function columnExists(tableName, columnName) {
    const result = await db.query(`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
              AND column_name = $2
        ) AS exists
    `, [tableName, columnName]);
    return !!result.rows[0]?.exists;
}

async function isTableOwner(tableName) {
    const result = await db.query(`
        SELECT tableowner = current_user AS is_owner
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = $1
    `, [tableName]);
    return !!result.rows[0]?.is_owner;
}

async function getTableState(tableName) {
    const exists = await tableExists(tableName);
    if (!exists) {
        return { exists: false, isOwner: false };
    }

    const isOwner = await isTableOwner(tableName);
    return { exists: true, isOwner };
}

async function addColumnIfMissing(tableName, columnName, definition) {
    const state = await getTableState(tableName);
    if (!state.exists) return 'missing_table';

    if (await columnExists(tableName, columnName)) {
        return 'exists';
    }

    if (!state.isOwner) {
        return 'not_owner';
    }

    await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    return 'added';
}

module.exports = {
    addColumnIfMissing,
    columnExists,
    getTableState,
    isTableOwner,
    tableExists,
};

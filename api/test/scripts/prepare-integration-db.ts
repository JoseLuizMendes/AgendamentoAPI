import pg from "pg";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} não está definido. Ex.: set ${name}=postgresql://postgres:postgres@localhost:5432/agendamento?schema=test`);
  }
  return value;
}

function getSchemaFromDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get("schema");
  if (!schema) {
    throw new Error(
      "Para os testes de integração, defina DATABASE_URL com ?schema=<nome> (ex.: .../agendamento?schema=test) para não poluir o schema public."
    );
  }
  return schema;
}

async function main(): Promise<void> {
  const databaseUrl = requireEnv("DATABASE_URL");
  const schema = getSchemaFromDatabaseUrl(databaseUrl);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema.replace(/"/g, "")}"`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

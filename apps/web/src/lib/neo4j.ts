import neo4j, { type Driver } from 'neo4j-driver';
import { env, neo4jEnabled } from './env';

let driver: Driver | null = null;

export function getNeo4jDriver() {
  if (!neo4jEnabled) {
    return null;
  }
  if (!driver) {
    driver = neo4j.driver(env.NEO4J_URI!, neo4j.auth.basic(env.NEO4J_USER!, env.NEO4J_PASSWORD!));
  }
  return driver;
}

export async function verifyNeo4jConnection() {
  const neoDriver = getNeo4jDriver();
  if (!neoDriver) return false;
  const session = neoDriver.session();
  try {
    await session.run('RETURN 1');
    return true;
  } finally {
    await session.close();
  }
}

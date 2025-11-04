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

export async function closeNeo4j() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

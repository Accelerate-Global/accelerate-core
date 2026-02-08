import type { Connector, ConnectorKey } from "./types";

export type ConnectorRegistry = {
  register: (connector: Connector) => void;
  get: (key: ConnectorKey) => Connector | null;
  list: () => Connector[];
};

export function createConnectorRegistry(): ConnectorRegistry {
  const map = new Map<string, Connector>();

  return {
    register: (connector) => {
      if (!connector.key) throw new Error("connector.key is required");
      if (map.has(connector.key)) throw new Error(`Connector already registered: ${connector.key}`);
      map.set(connector.key, connector);
    },
    get: (key) => {
      return map.get(key) ?? null;
    },
    list: () => {
      return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
    }
  };
}


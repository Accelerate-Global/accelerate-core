import type { Connector, ConnectorId } from "./types";

export type ConnectorRegistry = {
  register: (connector: Connector) => void;
  get: (id: ConnectorId) => Connector | null;
  list: () => Connector[];
};

export function createConnectorRegistry(): ConnectorRegistry {
  const map = new Map<string, Connector>();

  return {
    register: (connector) => {
      if (!connector.id) throw new Error("connector.id is required");
      if (map.has(connector.id)) throw new Error(`Connector already registered: ${connector.id}`);
      map.set(connector.id, connector);
    },
    get: (id) => {
      return map.get(id) ?? null;
    },
    list: () => {
      return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
    }
  };
}

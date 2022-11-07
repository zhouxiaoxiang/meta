import { CardApi } from "metabase/services";

export async function model({
  tableId,
  databaseId,
  collectionId,
}: {
  tableId: number;
  collectionId: number;
  databaseId?: number;
}) {
  // TODO get table name
  const name = "table name";

  return CardApi.create({
    name: name,
    dataset: true,
    dataset_query: {
      database: databaseId ?? null,
      query: {
        "source-table": tableId,
      },
      type: "query",
    },
    display: "table",
    description: null,
    visualization_settings: {},
    collection_id: collectionId,
    collection_position: 1,
    result_metadata: null,
  });
}

export async function page({ title, appId }) {
  return 1;
}

export async function question({ modelId, display }) {
  return 1;
}

export async function dashcard({ question, page, options }) {
  return 1;
}

export async function dashboardFilter({ page, options }) {
  return 1;
}

export async function action({ action }) {
  return 1;
}

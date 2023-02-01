import { restore } from "__support__/e2e/helpers";

import {
  QA_POSTGRES_PORT,
  QA_DB_CREDENTIALS,
} from "__support__/e2e/cypress_data";

describe.skip(
  "scenarios > admin > databases > add",
  { tags: "@external" },
  () => {
    beforeEach(() => {
      restore();
      cy.signInAsAdmin();
    });

    it("fails to report sync completion when enabling actions immediately #27877", () => {
      cy.request("POST", "/api/database", {
        engine: "postgres",
        name: "test db",
        details: {
          dbname: QA_DB_CREDENTIALS.database,
          host: QA_DB_CREDENTIALS.host,
          port: QA_POSTGRES_PORT,
          user: QA_DB_CREDENTIALS.user,
          password: QA_DB_CREDENTIALS.password, // NOTE: we're inconsistent in where we use `pass` vs `password` as a key
          "use-srv": false,
          "tunnel-enabled": false,
        },
        auto_run_queries: true,
        is_full_sync: true,
        schedules: {
          cache_field_values: {
            schedule_day: null,
            schedule_frame: null,
            schedule_hour: 0,
            schedule_type: "daily",
          },
          metadata_sync: {
            schedule_day: null,
            schedule_frame: null,
            schedule_hour: null,
            schedule_type: "hourly",
          },
        },
      }).then(({ status, body }) => {
        const { id: dbId } = body;

        cy.request("PUT", `/api/database/${dbId}`, {
          settings: { "database-enable-actions": true },
        }).then(({ status }) => {
          expect(status).to.equal(200);
        });

        // opening this so you can see the page keeps requesting sync status
        cy.visit("/admin/databases/2");

        cy.request("GET", `/api/database/${dbId}`).then(
          ({ body: database }) => {
            expect(database.initial_sync_status).to.equal("complete");
          },
        );
      });
    });
  },
);

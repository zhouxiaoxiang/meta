(ns metabase.models.app
  (:require [metabase.models.collection :refer [Collection]]
            [metabase.models.permissions :as perms]
            [metabase.models.serialization.hash :as serdes.hash]
            [metabase.util :as u]
            [methodical.core :as md]
            [toucan.db :as db]
            [toucan.models :as models]
            [toucan2.tools.hydrate :as t2.hydrate]))

(models/defmodel App :app)

;;; You can read/write an App if you can read/write its Collection
(derive App ::perms/use-parent-collection-perms)

(u/strict-extend #_{:clj-kondo/ignore [:metabase/disallow-class-or-type-on-model]} (class App)
  models/IModel
  (merge models/IModelDefaults
         {:types (constantly {:options :json
                              :nav_items :json})
          :properties (constantly {:timestamped? true
                                   :entity_id    true})})

  ;; Should not be needed as every app should have an entity_id, but currently it's
  ;; necessary to satisfy metabase-enterprise.models.entity-id-test/comprehensive-identity-hash-test.
  serdes.hash/IdentityHashable
  {:identity-hash-fields (constantly [:entity_id])})

(md/defmethod t2.hydrate/batched-hydrate [Collection :app_id]
  [_model _k collections]
  (if-let [coll-ids (seq (into #{}
                               (comp (map :id)
                                     ;; The ID "root" breaks the query.
                                     (filter int?))
                               collections))]
    (let [coll-id->app-id (into {}
                                (map (juxt :collection_id :id))
                                (db/select [App :collection_id :id]
                                           :collection_id [:in coll-ids]))]
      (for [coll collections]
        (let [app-id (coll-id->app-id (:id coll))]
          (cond-> coll
            app-id (assoc :app_id app-id)))))
    collections))

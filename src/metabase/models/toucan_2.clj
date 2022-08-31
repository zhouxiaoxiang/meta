(ns metabase.models.toucan-2
  "Toucan 2 support for Metabase models."
  (:require
   [camel-snake-kebab.core :as csk]
   [clojure.pprint :as pprint]
   [metabase.db.connection :as mdb.connection]
   [metabase.util :as u]
   [methodical.core :as md]
   [toucan.db :as db]
   [toucan.hydrate :as hydrate]
   [toucan.models :as models]
   [toucan2.core :as t2]
   [toucan2.instance :as t2.instance]
   [toucan2.jdbc.result-set :as t2.jdbc.result-set]
   [toucan2.model :as t2.model]
   [toucan2.protocols :as t2.protocols]
   [toucan2.tools.default-fields :as t2.default-fields]
   [toucan2.tools.hydrate :as t2.hydrate]))

;;; swap out [[models/defmodel]] with a special magical version that avoids redefining stuff if the definition has not
;;; changed at all. This is important to make the stuff in [[models.dispatch]] work properly, since we're dispatching
;;; off of the model objects themselves e.g. [[metabase.models.user/User]] -- it is important that they do not change

(defonce ^:private original-defmodel @(resolve `models/defmodel))

(defn print-method* [model-symb x writer]
  (if (models/model? x)
    (print-method model-symb writer)
    ((get-method print-method clojure.lang.IRecord) x writer)))

(defn pprint* [model-symb x]
  (if (models/model? x)
    (pprint/write-out model-symb)
    ((get-method pprint/simple-dispatch clojure.lang.IRecord) x)))

(defmacro ^:private defmodel [model & args]
  (let [varr           (ns-resolve *ns* model)
        model-symb     (symbol (name (ns-name *ns*)) (name model))
        existing-hash  (some-> varr meta ::defmodel-hash)
        has-same-hash? (= existing-hash (hash &form))]
    (when has-same-hash?
      (println model "has not changed, skipping redefinition"))
    `(do
       ~(when-not has-same-hash?
          `(do
             ~(apply original-defmodel &form &env model args)
             (alter-meta! (var ~model) assoc ::defmodel-hash ~(hash &form))))
       (extend-protocol t2.protocols/IDispatchValue
         (class ~model)
         (~'dispatch-value [~'_this]
          ~model))
       (extend-protocol t2.protocols/IModel
         (class ~model)
         (~'model [~'this]
          ~model))
       (defmethod print-method (class ~model)
         [~'x ~'writer]
         (print-method* '~model-symb ~'x ~'writer))
       (defmethod pprint/simple-dispatch (class ~model)
         [~'x]
         (pprint* '~model-symb ~'x))
       (derive ~model ::model))))

(doto #'models/defmodel
  (alter-var-root (constantly @#'defmodel))
  (alter-meta! merge (select-keys (meta #'defmodel) [:file :line :column :namespace])))

;;; t2 method implementations

(md/defmethod t2/do-with-connection ::application-db
  [_connectable f]
  (t2/do-with-connection mdb.connection/*application-db* f))

(md/prefer-method! #'t2/do-with-connection javax.sql.DataSource clojure.lang.IPersistentMap)

(md/defmethod t2/default-connectable ::model
  [_model]
  ::application-db)

(md/defmethod t2/table-name ::model
  [model]
  (:table model))

(md/defmethod t2.instance/empty-map ::model
  [_model]
  {})

(md/defmethod t2.instance/key-transform-fn ::model
  [_model]
  (comp keyword u/lower-case-en u/qualified-name))

(md/defmethod t2/primary-keys ::model
  [model]
  [(models/primary-key model)])

(t2.default-fields/define-default-fields ::model
  (models/default-fields &model))

(md/defmethod t2.hydrate/fk-keys-for-automagic-hydration [::model :default ::model]
  [original-model dest-key hydrated-model]
  (mapv csk/->snake_case_keyword (next-method original-model dest-key hydrated-model)))

(md/defmethod t2.model/do-with-model clojure.lang.Symbol
  [symb f]
  (t2.model/do-with-model (db/resolve-model symb) f))

;;; Tell Toucan 2 how to read Postgres `citext` columns.
(md/defmethod t2.jdbc.result-set/read-column-thunk [:default :default java.sql.Types/OTHER]
  [conn model ^java.sql.ResultSet rset ^java.sql.ResultSetMetaData rsmeta ^Long i]
  (if (= (.getColumnTypeName rsmeta i) "citext")
    (fn []
      (.getString rset i))
    (next-method conn model rset rsmeta i)))

(t2/define-after-select ::model
  [instance]
  (models/do-post-select (t2/model instance) instance))

;; Use Toucan 2 hydrate instead of Toucan 1 hydrate.
(doto #'hydrate/hydrate
  (alter-var-root (constantly @#'t2.hydrate/hydrate))
  (alter-meta! merge (select-keys (meta #'t2.hydrate/hydrate) [:file :line :column :namespace])))

(md/defmethod t2.hydrate/simple-hydrate :around :default
  [model k row]
  (when (some? row)
    (assert (map? row) (format "simple hydrate for %s %s expected a map, got %s" (some-> model name) (pr-str k) (pr-str row))))
  (doto (next-method model k row)
    (assert (format "%s for model %s key %s did not return a valid row"
                    `t2.hydrate/simple-hydrate
                    (pr-str (name model))
                    (pr-str k)))))

(md/defmethod t2.hydrate/batched-hydrate :around :default
  [model k rows]
  (let [results (next-method model k rows)]
    (assert (= (count rows)
               (count results))
            (assert (format "%s for model %s key %s did not return the same number of rows"
                            `t2.hydrate/simple-hydrate
                            (pr-str (name model))
                            (pr-str k))))
    results))

(comment
  (t2.hydrate/set-error-on-unknown-key! true))

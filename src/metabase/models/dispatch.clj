(ns metabase.models.dispatch
  "Helpers to assist in the transition to Toucan 2. Once we switch to Toucan 2 this stuff shouldn't be needed, but we
  can update this namespace instead of having to update code all over the place."
  (:require
   [potemkin :as p]
   [schema.core :as s]
   [toucan.db :as db]
   [toucan.models :as models]
   [toucan2.core :as t2]))

(def ^{:arglists '([x])} toucan-instance?
  "True if `x` is a Toucan instance, but not a Toucan model."
  t2/instance?)

(defn instance-of?
  "Is `x` an instance of a some Toucan `model`? Use this instead of of using the `<Model>Instance` or calling [[type]]
  or [[class]] on a model yourself, since that won't work once we switch to Toucan 2."
  [model x]
  (t2/instance-of? (models/resolve-model model) x))

(defn InstanceOf
  "Helper for creating a schema to check whether something is an instance of `model`. Use this instead of of using the
  `<Model>Instance` or calling [[type]] or [[class]] on a model yourself, since that won't work once we switch to
  Toucan 2.

    (s/defn my-fn :- (mi/InstanceOf User)
      []
      ...)"
  [model]
  (s/pred (fn [x]
            (instance-of? model x))
          (format "instance of a %s" (name model))))

(p/import-vars [t2 model])

(defn instance
  "Create a new instance of Toucan `model` with a map `m`.

    (instance User {:first_name \"Cam\"})"
  ([model]
   (let [model (db/resolve-model model)]
     (empty model)))
  ([model m]
   (into (instance model) m)))

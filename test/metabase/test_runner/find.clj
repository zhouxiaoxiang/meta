(ns metabase.test-runner.find
  (:require [clojure.java.classpath :as classpath]
            [clojure.java.io :as io]
            [clojure.tools.namespace.find :as ns-find]
            eftest.runner
            [metabase.test-runner.init :as init]
            [metabase.test.data.env :as tx.env]))

(defmulti find-tests
  "Find test vars in `arg`, which can be a string directory name, symbol naming a specific namespace or test, or a
  collection of one or more of the above."
  {:arglists '([arg])}
  type)

;; collection of one of the things below
(defmethod find-tests clojure.lang.Sequential
  [coll]
  (mapcat find-tests coll))

;; directory name
(defmethod find-tests String
  [dir-name]
  (find-tests (io/file dir-name)))

(def ^:private excluded-directories
  "When searching the classpath for tests (i.e., if no `:only` options were passed), don't look for tests in any
  directories with these name (as the last path component)."
  #{"src"
    "test_config"
    "resources"
    "test_resources"
    "resources-ee"
    "classes"})

;; directory
(defmethod find-tests java.io.File
  [^java.io.File file]
  (when (and (.isDirectory file)
             (not (some (partial = (.getName file)) excluded-directories))
             (if-let [[_ driver] (re-find #"modules/drivers/([^/]+)/" (str file))]
               (contains? (tx.env/test-drivers) (keyword driver))
               true))
    (println "Looking for test namespaces in directory" (str file))
    (->> (ns-find/find-namespaces-in-dir file)
         (filter #(re-matches  #"^metabase.*test$" (name %)))
         (mapcat find-tests))))

;; a test namespace or individual test
(defmethod find-tests clojure.lang.Symbol
  [symb]
  (letfn [(load-test-namespace [ns-symb]
            (binding [init/*test-namespace-being-loaded* ns-symb]
              (require ns-symb)))]
    (if-let [symbol-namespace (some-> (namespace symb) symbol)]
      ;; a actual test var e.g. `metabase.whatever-test/my-test`
      (do
        (load-test-namespace symbol-namespace)
        [(resolve symb)])
      ;; a namespace e.g. `metabase.whatever-test`
      (do
        (load-test-namespace symb)
        (eftest.runner/find-tests symb)))))

;; default -- look in all dirs on the classpath
(defmethod find-tests nil
  [_]
  (find-tests (classpath/system-classpath)))

(defn tests [{:keys [only]}]
  (when only
    (println "Running tests in" (pr-str only)))
  (let [tests (find-tests only)]
    (println "Running" (count tests) "tests")
    tests))

(ns metabase.test-runner.bootstrap.graph-2
  (:import java.io.File
           java.util.regex.Pattern))

(def ^:dynamic *path* [])

(def ^:dynamic *lib->deps* nil)

(defonce orig-load-one @#'clojure.core/load-one)

(defn new-load-one [lib need-ns require]
  (print "require ")
  (dotimes [_ (count *path*)]
    (print "|  "))
  (printf "├─ %s\n" lib)
  (flush)
  (orig-load-one lib need-ns require))

(defonce orig-load-lib @#'clojure.core/load-lib)

(defn new-load-lib [prefix lib & options]
  (let [lib'   (if prefix (symbol (str prefix \. lib)) lib)
        result (binding [*path* (conj *path* lib')]
                 (apply orig-load-lib prefix lib options))]
    (when-not (get @*lib->deps* lib')
      (swap! *lib->deps* assoc lib' (sorted-set)))
    (swap! *lib->deps* update (last *path*) conj lib')
    result))

(defn str-replace [^String s ^Pattern match ^String replacement]
  (.replaceAll (re-matcher match s) replacement))

(defn file->ns [^java.io.File file]
  (-> (str file)
      (str-replace #"^test/" "")
      (str-replace #"^shared/test/" "")
      (str-replace #"\.cljc?$" "")
      (str-replace #"_" "-")
      (str-replace #"/" ".")
      symbol))

(defn test-namespaces []
  (into
   (sorted-set)
   (comp (map #(java.io.File. ^String %))
         (mapcat file-seq)
         (filter #(.isFile ^File %))
         (filter #(re-matches #".*_test\.cljc?$" (.getName ^File %)))
         (map file->ns))
   ["shared/test" "test"]))

(defn create-graph-2
  ([]
   (create-graph-2 (test-namespaces)))
  ([libs]
   (binding [clojure.core/*loaded-libs* (ref (sorted-set))
             *lib->deps*                (atom {})]
     (with-redefs [clojure.core/load-one new-load-one
                   clojure.core/load-lib new-load-lib]
       (doseq [lib libs]
         (require lib)))
     (dissoc @*lib->deps* nil))))

(defn write-graph [_]
  (let [graph (create-graph-2)]
    (println "WRITE GRAPH WITH" (count graph) "NAMESPACES")
    (with-open [w (java.io.FileWriter. (java.io.File. "test_resources/graph.1.edn"))]
      ((requiring-resolve 'clojure.pprint/pprint) graph w))
    (println "DONE")
    (System/exit 0)))

(ns metabase.bootstrap-hybrid
  (:require [metabase.bootstrap-common :as c]))

(def ^:private deps
  '[[clojure.core]
    [clojure.walk #{clojure.core}]
    [clojure.tools.analyzer.env #{clojure.core}]
    [clojure.tools.analyzer.utils #{clojure.tools.analyzer.env clojure.core}]
    [clojure.tools.analyzer.ast #{clojure.core clojure.tools.analyzer.utils}]
    [clojure.tools.analyzer.passes.jvm.validate-recur
     #{clojure.tools.analyzer.ast clojure.core clojure.tools.analyzer.utils}]
    [clojure.core.async.impl.protocols #{clojure.core}]
    [clojure.core.async.impl.mutex #{clojure.core clojure.core.async.impl.protocols}]
    [clojure.core.async.impl.concurrent #{clojure.core}]
    [clojure.core.async.impl.exec.threadpool
     #{clojure.core.async.impl.concurrent clojure.core clojure.core.async.impl.protocols}]
    [clojure.core.async.impl.dispatch
     #{clojure.core clojure.core.async.impl.protocols clojure.core.async.impl.exec.threadpool}]
    [clojure.core.async.impl.channels
     #{clojure.core clojure.core.async.impl.protocols clojure.core.async.impl.dispatch clojure.core.async.impl.mutex}]
    [clojure.core.async.impl.timers #{clojure.core.async.impl.channels clojure.core clojure.core.async.impl.protocols}]
    [clojure.set #{clojure.core}]
    [clojure.string #{clojure.core}]
    [clojure.java.io #{clojure.core clojure.string}]
    [clojure.tools.reader.default-data-readers #{clojure.core}]
    [clojure.edn #{clojure.core}]
    [clojure.tools.logging.impl #{clojure.core}]
    [clojure.tools.reader.impl.inspect #{clojure.core}]
    [clojure.pprint #{clojure.core clojure.walk}]
    [clojure.tools.reader.impl.utils #{clojure.core}]
    [clojure.tools.reader.reader-types #{clojure.tools.reader.impl.utils clojure.core}]
    [clojure.tools.reader.impl.errors #{clojure.tools.reader.reader-types clojure.core clojure.tools.reader.impl.inspect}]
    [clojure.tools.reader.impl.commons
     #{clojure.tools.reader.impl.utils clojure.tools.reader.impl.errors clojure.tools.reader.reader-types clojure.core}]
    [clojure.tools.reader
     #{clojure.tools.reader.impl.utils
       clojure.tools.reader.impl.commons
       clojure.tools.reader.impl.errors
       clojure.tools.reader.reader-types
       clojure.core
       clojure.tools.reader.default-data-readers}]
    [clojure.tools.logging #{clojure.core clojure.pprint clojure.string clojure.tools.logging.impl}]
    [colorize.core #{clojure.core clojure.pprint}]
    [clojure.tools.analyzer.passes #{clojure.tools.analyzer.ast clojure.core clojure.tools.analyzer.utils}]
    [clojure.tools.analyzer.passes.source-info #{clojure.tools.analyzer.ast clojure.core clojure.tools.analyzer.utils}]
    [clojure.data.priority-map #{clojure.core}]
    [clojure.core.cache #{clojure.data.priority-map clojure.core}]
    [clojure.core.protocols #{clojure.core}]
    [clojure.datafy #{clojure.core.protocols clojure.core}]
    [clojure.reflect #{clojure.datafy clojure.core clojure.set clojure.string}]
    [clojure.core.memoize #{clojure.core.cache clojure.core}]
    [clojure.tools.analyzer.jvm.utils
     #{clojure.core.memoize
       clojure.reflect
       clojure.tools.analyzer.env
       clojure.core
       clojure.tools.analyzer.utils
       clojure.java.io
       clojure.string}]
    [clojure.tools.analyzer.passes.elide-meta #{clojure.core clojure.tools.analyzer.passes.source-info}]
    [clojure.tools.analyzer.passes.constant-lifter #{clojure.core clojure.tools.analyzer.utils}]
    [clojure.tools.analyzer #{clojure.tools.analyzer.env clojure.core clojure.tools.analyzer.utils}]
    [clojure.tools.analyzer.passes.jvm.analyze-host-expr
     #{clojure.tools.analyzer clojure.core clojure.tools.analyzer.utils clojure.tools.analyzer.jvm.utils}]
    [clojure.tools.analyzer.passes.jvm.constant-lifter
     #{clojure.tools.analyzer.passes.jvm.analyze-host-expr
       clojure.tools.analyzer
       clojure.tools.analyzer.passes.constant-lifter
       clojure.tools.analyzer.passes.elide-meta
       clojure.core
       clojure.tools.analyzer.utils}]
    [clojure.tools.analyzer.passes.jvm.annotate-tag
     #{clojure.tools.analyzer.passes.jvm.constant-lifter clojure.core clojure.tools.analyzer.jvm.utils}]
    [clojure.tools.analyzer.passes.uniquify
     #{clojure.tools.analyzer.ast clojure.tools.analyzer.env clojure.core clojure.tools.analyzer.utils}]
    [clojure.tools.analyzer.passes.add-binding-atom
     #{clojure.tools.analyzer.ast clojure.tools.analyzer.passes.uniquify clojure.core}]
    [clojure.tools.analyzer.passes.jvm.annotate-loops #{clojure.tools.analyzer.ast clojure.core}]
    [clojure.tools.analyzer.passes.jvm.fix-case-test #{clojure.core clojure.tools.analyzer.passes.add-binding-atom}]
    [clojure.tools.analyzer.passes.cleanup #{clojure.core}]
    [clojure.tools.analyzer.passes.jvm.annotate-host-info
     #{clojure.tools.analyzer.ast
       clojure.tools.analyzer
       clojure.tools.analyzer.passes.elide-meta
       clojure.tools.analyzer.passes.cleanup
       clojure.core
       clojure.tools.analyzer.utils
       clojure.tools.analyzer.jvm.utils}]
    [clojure.tools.analyzer.passes.trim
     #{clojure.tools.analyzer.ast clojure.tools.analyzer.passes.elide-meta clojure.core}]
    [clojure.tools.analyzer.passes.jvm.infer-tag
     #{clojure.tools.analyzer.env
       clojure.tools.analyzer.passes.trim
       clojure.tools.analyzer.passes.jvm.analyze-host-expr
       clojure.tools.analyzer.passes.jvm.annotate-host-info
       clojure.core
       clojure.set
       clojure.tools.analyzer.utils
       clojure.tools.analyzer.jvm.utils
       clojure.tools.analyzer.passes.jvm.fix-case-test
       clojure.tools.analyzer.passes.jvm.annotate-tag}]
    [clojure.tools.analyzer.passes.jvm.validate
     #{clojure.tools.analyzer.ast
       clojure.tools.analyzer.env
       clojure.tools.analyzer.passes.jvm.analyze-host-expr
       clojure.tools.analyzer.passes.cleanup
       clojure.core
       clojure.tools.analyzer.utils
       clojure.tools.analyzer.jvm.utils
       clojure.tools.analyzer.passes.jvm.infer-tag
       clojure.tools.analyzer.passes.jvm.validate-recur}]
    [clojure.tools.analyzer.passes.jvm.classify-invoke
     #{clojure.core
       clojure.tools.analyzer.utils
       clojure.tools.analyzer.jvm.utils
       clojure.tools.analyzer.passes.jvm.validate}]
    [clojure.tools.analyzer.passes.jvm.validate-loop-locals
     #{clojure.tools.analyzer.ast
       clojure.tools.analyzer.passes.jvm.analyze-host-expr
       clojure.core
       clojure.tools.analyzer.jvm.utils
       clojure.tools.analyzer.passes.jvm.infer-tag
       clojure.tools.analyzer.passes.jvm.classify-invoke
       clojure.tools.analyzer.passes.jvm.validate}]
    [clojure.tools.analyzer.passes.jvm.box
     #{clojure.core
       clojure.tools.analyzer.utils
       clojure.tools.analyzer.jvm.utils
       clojure.tools.analyzer.passes.jvm.infer-tag
       clojure.tools.analyzer.passes.jvm.validate}]
    [clojure.core.async.impl.buffers #{clojure.core clojure.core.async.impl.protocols}]
    [clojure.tools.analyzer.passes.emit-form #{clojure.tools.analyzer.passes.uniquify clojure.core}]
    [clojure.tools.analyzer.passes.jvm.emit-form
     #{clojure.tools.analyzer.passes.uniquify clojure.tools.analyzer.passes.emit-form clojure.core}]
    [clojure.tools.analyzer.passes.jvm.warn-on-reflection
     #{clojure.core clojure.tools.analyzer.passes.jvm.validate-loop-locals clojure.tools.analyzer.passes.jvm.validate}]
    [clojure.tools.analyzer.passes.warn-earmuff #{clojure.core clojure.tools.analyzer.utils}]
    [clojure.tools.analyzer.jvm
     #{clojure.tools.analyzer.ast
       clojure.tools.analyzer.passes.uniquify
       clojure.tools.analyzer.passes.warn-earmuff
       clojure.core.memoize
       clojure.tools.analyzer.env
       clojure.tools.analyzer.passes.trim
       clojure.tools.analyzer.passes.jvm.analyze-host-expr
       clojure.tools.analyzer.passes.jvm.constant-lifter
       clojure.tools.reader.reader-types
       clojure.tools.analyzer.passes.jvm.warn-on-reflection
       clojure.tools.analyzer
       clojure.tools.analyzer.passes.jvm.emit-form
       clojure.tools.analyzer.passes.elide-meta
       clojure.core
       clojure.tools.analyzer.passes.jvm.box
       clojure.tools.analyzer.utils
       clojure.tools.analyzer.passes.jvm.validate-loop-locals
       clojure.tools.analyzer.jvm.utils
       clojure.tools.reader
       clojure.tools.analyzer.passes.jvm.infer-tag
       clojure.tools.analyzer.passes.jvm.classify-invoke
       clojure.tools.analyzer.passes.jvm.validate
       clojure.java.io
       clojure.tools.analyzer.passes.source-info
       clojure.tools.analyzer.passes}]
    [clojure.core.async.impl.ioc-macros
     #{clojure.tools.analyzer.jvm
       clojure.tools.analyzer.ast
       clojure.tools.analyzer.env
       clojure.tools.analyzer.passes.jvm.warn-on-reflection
       clojure.tools.analyzer
       clojure.core
       clojure.set
       clojure.pprint
       clojure.core.async.impl.protocols
       clojure.core.async.impl.dispatch
       clojure.tools.analyzer.passes.jvm.annotate-loops
       clojure.tools.analyzer.passes}]
    [clojure.core.async
     #{clojure.core.async.impl.concurrent
       clojure.core.async.impl.channels
       clojure.core.async.impl.ioc-macros
       clojure.core.async.impl.buffers
       clojure.core
       clojure.core.async.impl.protocols
       clojure.core.async.impl.dispatch
       clojure.core.async.impl.mutex
       clojure.core.async.impl.timers}]
    [progrock.core #{clojure.core clojure.string}]
    [metabase.bootstrap-core-async
     #{clojure.tools.logging
       clojure.core
       colorize.core
       clojure.set
       clojure.core.async
       clojure.pprint
       clojure.edn
       clojure.java.io
       clojure.string
       progrock.core}]])

(defmulti bootstrapper keyword)

(defmethod bootstrapper :serial
  [_]
  (^:once fn* [libs]
   (.bindRoot #'c/pool-size 1)
   (c/init-messages-agent! (count libs))
   (doseq [[lib] libs]
     (c/thread-printf "%s %s" c/+load+ lib)
     (c/tick)
     (require lib))))

(defmethod bootstrapper :debug
  [_]
  (^:once fn* [libs]
   ((requiring-resolve 'metabase.debug/parallel-require) libs)))

(defmethod bootstrapper :simple
  [_]
  (^:once fn* [libs]
   ((requiring-resolve 'metabase.bootstrap/parallel-require) libs)))

(defmethod bootstrapper :core-async
  [_]
  (^:once fn* [libs]
   ((requiring-resolve 'metabase.bootstrap-core-async/parallel-require) libs)))

(defmethod bootstrapper :hybrid
  [_]
  (^:once fn* [libs]
   (c/thread-printf "BOOTSTRAP STAGE 1: LOAD BASIC BOOTSTRAPPER")
   ((requiring-resolve 'metabase.bootstrap/parallel-require) deps)
   (c/thread-printf "BOOTSTRAP STAGE 3: BOOTSTRAP METABASE.CORE")
   ((bootstrapper :core-async) libs)))

(defmethod bootstrapper :no-op
  [_]
  (^:once fn* [libs]
   (require 'metabase.core)))

(defmethod bootstrapper :simple-2
  [_]
  (^:once fn* [libs]
   ((requiring-resolve 'metabase.bootstrap-simple-2/parallel-require) libs)))

(defmethod bootstrapper :simple-3
  [_]
  (^:once fn* [libs]
   ((requiring-resolve 'metabase.bootstrap-simple-3/parallel-require) libs)))

(defmethod bootstrapper :simple-4
  [_]
  (^:once fn* [libs]
   ((requiring-resolve 'metabase.bootstrap-simple-4/parallel-require) libs)))

;; time clojure -A:user:dev -e "(require 'metabase.core) (System/exit 0)"
;;
;; real    0m25.534s
;; user    1m7.067s
;; sys     0m3.262s

;; time clojure -A:user:dev -e "((requiring-resolve 'metabase.bootstrap-hybrid/bootstrap) :hybrid 32)"
;;
;;   n    no-op       simple      core.async  hybrid      simple-2
;;   1    25.644s     27.928s     27.556s     28.122s     28.011s
;;   2      -         22.331s     18.997s     19.105s     18.035s
;;   4      -         17.421s     14.972s     14.918s     14.066s
;;   8      -         15.021s     15.391s     14.855s     13.819s
;;  16      -         13.394s     15.196s     14.448s     13.497s
;;  32      -         13.524s     15.597s     14.935s     13.827s
;;  64      -         13.017s     15.713s     14.839s     14.000s
;; 128      -         13.113s        -           -        14.467s
(defn bootstrap [strategy num-threads]
  (.bindRoot #'c/pool-size num-threads)
  (try
    ((bootstrapper strategy))
    (require 'metabase.core)
    (c/thread-printf c/+done+)
    (shutdown-agents)
    (println c/+clear-to-end-of-screen+)
    (System/exit 0)
    (catch Throwable e
      (c/thread-printf "%s %s" c/+error+ (c/error-message e))
      (shutdown-agents)
      (println e)
      (System/exit 2))))

;; time clojure -A:user:dev -e "((requiring-resolve 'metabase.bootstrap/profile))"
;;
;; real    0m16.595s
;; user    2m21.020s
;; sys     0m12.651s
#_(defn profile []
  (load-core)
  ((requiring-resolve 'metabase.cmd/profile))
  (System/exit 0))

;; time clojure -A:user:dev -e "(require 'metabase.core) ((requiring-resolve 'metabase.cmd/profile)) (System/exit 0)"
;;
;; real    0m28.039s
;; user    1m17.168s
;; sys     0m4.428s

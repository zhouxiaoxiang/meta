(ns metabase.lib.native
  "Functions for working with native queries.")

(def ^:private variable-tag-regex
  #"\{\{\s*([A-Za-z0-9_\.]+)\s*\}\}")

(def ^:private snippet-tag-regex
  #"\{\{\s*(snippet:\s*[^}]+)\s*\}\}")

(def ^:private card-tag-regex
  #"\{\{\s*(#([0-9]*)(-[a-z0-9-]*)?)\s*\}\}")

(def ^:private tag-regexes
  [variable-tag-regex snippet-tag-regex card-tag-regex])

(defn recognize-template-tags
  "Given the text of a native query, extract a possibly-empty set of template tag strings from it."
  [query-text]
  (into #{}
        (comp (mapcat #(re-seq % query-text))
                  (map second))
        tag-regexes))

"""The page template is split into parts: template/template.html holds the HTML and pulls in the rest with
include lines, e.g.  //@include js/maps.js  or  /*@include site.css*/  (paths relative to template/).
expand() puts the parts back together; assemble.py builds the site from the result."""
import os, re

INC = re.compile(r'^[ \t]*(?://|/\*)@include ([\w./-]+)(?:[ \t]*\*/)?[ \t]*\n', re.M)

def expand(path):
    base = os.path.dirname(os.path.abspath(path))
    text = open(path, encoding='utf-8').read()
    return INC.sub(lambda m: expand(os.path.join(base, m.group(1))), text)

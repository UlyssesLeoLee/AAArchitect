import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/'scripts'))
from build import run,localize_model
from validate import validate
MODEL=ROOT/'assets/examples/illustrative-architecture.json'

class ArchitectureTests(unittest.TestCase):
 def setUp(self):self.model=json.loads(MODEL.read_text(encoding='utf8'))
 def test_languages_and_12_views(self):
  for language in ('zh-CN','ja-JP','en-US'):
   with self.subTest(lang=language):
    errs,warns=validate(self.model,False,language)
    self.assertEqual(errs,[]);self.assertEqual(warns,[])
    localized=localize_model(self.model,language)
    self.assertEqual(localized['meta']['language'],language)
    self.assertEqual(len(localized['views']),12)
    self.assertEqual({n['id'] for n in localized['nodes']},{n['id'] for n in self.model['nodes']})
    self.assertTrue(all(v['reviewIntent'] for v in localized['views']))
    self.assertFalse(any('i18n' in v for v in localized['views']))
 def test_build_generates_real_threejs_project(self):
  with tempfile.TemporaryDirectory() as temp:
   path=Path(temp)
   for language in ('zh-CN','ja-JP','en-US'):
    out=path/language
    self.assertEqual(run([str(MODEL),'--out',str(out),'--lang',language]),0)
    self.assertIn("from 'three'",(out/'src/main.js').read_text(encoding='utf8'))
    self.assertIn('<html lang="'+language+'">',(out/'index.html').read_text(encoding='utf8'))
    self.assertEqual(json.loads((out/'viewer-config.json').read_text(encoding='utf8'))['language'],language)
    self.assertTrue((out/'tests/layout.test.mjs').exists())
 def test_unsafe_or_incomplete_architecture_is_not_strict(self):
  self.assertTrue(validate(self.model,True,'zh-CN')[0])
  self.model['nodes'][0]['verification']='confirmed'
  self.model['views'][0]['dimensions']['y']['field']=self.model['views'][0]['dimensions']['x']['field']
  self.assertTrue(validate(self.model,False,'zh-CN')[0])
 def test_no_missing_language_can_be_silently_selected(self):
  self.assertTrue(validate(self.model,False,'fr-FR')[0])
  with tempfile.TemporaryDirectory() as temp:
   self.assertEqual(run([str(MODEL),'--out',str(Path(temp)/'fr'),'--lang','fr-FR']),1)

if __name__=='__main__':unittest.main()

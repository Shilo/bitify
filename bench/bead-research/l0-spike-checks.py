import unittest
import numpy as np
from importlib.util import spec_from_file_location,module_from_spec
from pathlib import Path

spec = spec_from_file_location('l0_spike',Path(__file__).with_name('l0-spike.py'))
spike = module_from_spec(spec)
spec.loader.exec_module(spike)

class Checks(unittest.TestCase):
    def test_constant_image_does_not_gain_a_texture_or_color_shift(self):
        source = np.full((16,24,3),[.7,.8,.9])
        self.assertTrue(np.allclose(spike.smooth(source,.03),source,atol=1e-12))

    def test_opaque_extension_uses_visible_rgb_and_preserves_visible_cells(self):
        labels = np.full((8,8),-1)
        source = np.zeros((8,8,3))
        labels[3,3] = 0
        source[3,3] = [.4,.7,.9]
        filled = spike.opaque_extension(source,labels)
        self.assertTrue(np.allclose(filled,[.4,.7,.9]))
        self.assertTrue(np.array_equal(source[3,3],filled[3,3]))

    def test_global_smoothing_removes_a_low_contrast_authored_dot(self):
        source = np.full((32,32,3),.8)
        source[16,16] = .82
        result = spike.smooth(source,.01)
        self.assertLess(float(np.max(result)-np.min(result)),1e-5)

if __name__ == '__main__':
    unittest.main()

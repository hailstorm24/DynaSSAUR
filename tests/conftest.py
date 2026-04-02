import sys
import os

# Make turtle_shim importable from the public assets directory.
_public = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'client', 'public')
sys.path.insert(0, os.path.abspath(_public))

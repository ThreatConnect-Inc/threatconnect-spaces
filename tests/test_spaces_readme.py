#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os


def test_playbook_readme():
    """Make sure each app has a readme.md."""
    missing_readmes = 0

    for path, dirs, files in os.walk(os.path.abspath(os.path.join(os.path.dirname(__file__), "../spaces"))):
        # only check for a readme if there are files and if the directory is a tc playbook app
        if len(files) > 0:
            lower_cased_file_names = [file_.lower() for file_ in files]
            try:
                assert 'readme.md' in lower_cased_file_names
            except AssertionError:
                missing_readmes += 1
                print("No README.md file in {}".format(path))

    assert missing_readmes == 0

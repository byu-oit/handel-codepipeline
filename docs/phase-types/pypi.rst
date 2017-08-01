Pypi
======
The *Pypi* phase type configures a pipeline phase to deploy one or more of your application environments using the Pypi library.

Parameters
----------

.. list-table::
   :header-rows: 1
   
   * - Parameter
     - Type
     - Required
     - Default
     - Description
   * - type
     - string
     - Yes
     - pypi
     - This must always be *pypi* for the Pypi phase type.
   * - name
     - string
     - Yes
     -
     - The value you want to show up in the CodePipeline UI as your phase name.
   * - server
     - string
     - No
     - pypi
     - The full url for the pypi repo ie: https://test.pypi.org/legacy/
   * - build_image
     - string
     - No
     - aws/codebuild/python:3.5.2
     - The code build image needed to deploy project to pypi. See here for more info `AWS Codebuild Docs <http://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref.html>`_

Secrets
-------
In addition to the parameters specified in your handel-codepipeline.yml file, this phase will prompt you for the following secret information when creating your pipeline:

* Pypi Username.
* Pypi Password.

For Security reasons these are not saved in your handel-codepipeline.yml file.

Example Phase Configuration
---------------------------
This snippet of a handel-codepipeline.yml file shows the Pypi phase being configured:

.. code-block:: yaml

    version: 1

    pipelines:
      dev:
        phases:
        ...
        - type: pypi
          name: pypiDeploy
          server: https://testpypi.python.org/pypi
        ...

Runscope
========
The *Runscope* phase type configures a pipeline phase to execute tests from a Runscope bucket.

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
     - runscope
     - This must always be *runscope* for the Runscope phase type.

Secrets
-------
This phase will prompt you for the following secret information when creating your pipeline:

* Runscope Trigger URL
* Runscope API Access Token

These secrets are not saved in your handel-codepipeline.yml file because they allow others to invoke your tests and make API calls to Runscope on your behalf.

Example Phase Configuration
---------------------------
This snippet of a handel-codepipeline.yml file shows the GitHub phase being configured:

.. code-block:: yaml
    
    version: 1

    pipelines:
      dev:
        ...
        phases:
        - type: runscope
          name: RunscopeTests
        ...

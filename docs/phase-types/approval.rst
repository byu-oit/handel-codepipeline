Approval
========
The *Approval* phase type configures a pipeline phase to require manual approval before proceeding with the rest of the pipeline.

Parameters
----------
This phase type doesn't take any parameters in the *handel-codepipeline.yml* file.

Secrets
-------
This phase type doesn't prompt for any secrets when creating the pipeline.

Example Phase Configuration
---------------------------
This snippet of a *handel-codepipeline.yml* file shows the GitHub phase being configured:

.. code-block:: yaml
    
    version: 1

    pipelines:
      dev:
        ...
        phases:
        - type: approval
          name: ManualApproval
        ...

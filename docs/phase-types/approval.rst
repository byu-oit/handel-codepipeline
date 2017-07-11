Approval
========
The *Approval* phase type configures a pipeline phase to require manual approval before proceeding with the rest of the pipeline.

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
     - approval
     - This must always be *approval* for the Approval phase type.
   * - name
     - string
     - Yes
     -
     - The value you want to show up in the CodePipeline UI as your phase name.

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

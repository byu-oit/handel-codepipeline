Handel
======
The *Handel* phase type configures a pipeline phase to deploy one or more of your application environments using the Handel library. You may configure multiple phases of this type if you wish to deploy your application environments acrosss different phases. 

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
     - handel
     - This must always be *handel* for the Handel phase type.
   * - environments_to_deploy
     - list<string>
     - Yes
     - 
     - A list of one or more environment names from your Handel file that you wish to deploy in this phase.

Secrets
-------
This phase type doesn't prompt for any secrets when creating the pipeline.

Example Phase Configuration
---------------------------
This snippet of a handel-codepipeline.yml file shows the Handel phase being configured:

.. code-block:: yaml

    version: 1

    pipelines:
      dev:
        phases:
        - type: handel
          name: DevDeploy
          environments_to_deploy:
          - dev
        ...

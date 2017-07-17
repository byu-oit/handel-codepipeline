Handel Delete
=============
The *Handel Delete* phase type configures a pipeline phase to delete one or more of your Handel application environments that was previously deployed. This phase is useful if you want to spin up an ephemeral environment, run tests against it, and delete the environment after the tests.

.. WARNING::

    **This environment will DELETE all resources in an environment, including data resources such as RDS, ElastiCache, and DynamoDB!**
    
    The data from these will likely be unrecoverable once deleted. You should only use this phase type against ephemeral environments that don't need to persist data.

    **Use this phase at your own risk.** It is highly recommended you double-check which environments are being deleted before adding this phase to a pipeline.

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
     - handel_delete
     - This must always be *handel_delete* for the Handel Delete phase type.
   * - name
     - string
     - Yes
     -
     - The value you want to show up in the CodePipeline UI as your phase name.
   * - environments_to_delete
     - list<string>
     - Yes
     - 
     - A list of one or more environment names from your Handel file that you wish to delete in this phase.

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
        - type: handel_delete
          name: Teardown
          environments_to_delete:
          - dev
        ...

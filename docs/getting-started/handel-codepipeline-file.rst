.. _handel-codepipeline-file:

Handel CodePipeline File
========================
Handel-CodePipeline requires you to specify a pipeline specification file, in addition to your Handel file. This specification file must be named *handel-codepipeline.yml*. It doesn't contain any secrets, so it may be committed to your repository alongside your Handel file.

Handel-CodePipeline File Specification
--------------------------------------
The Handel-Codepipeline file is a YAML file that has the following schema:

.. code-block:: yaml
    
    version: 1

    pipelines:
      <pipeline_name>:
        phases:
        - type: <phase_type>
          name: <phase_name>
          <phase_params>

The above file schema shows that you can specify one or more pipelines, giving them a unique <pipeline_name>. In each pipeline, you specify an ordered series of phases. Each phase has a <type> and a <name>. The type field is defined by Handel-Codepipeline, and the name field is one that you specify.

Each phase then has additional parameters that are specific to the phase type. See the [[Pipeline Phase Types]] section for information on each phase type.

.. IMPORTANT::

    **The first two phases are required to be of a certain type.** The first phase must be a source code action type such as *github*. The second phase must be a build action type such as *codebuild*.
.. _installation:

Installation
============
Handel-CodePipeline is a CLI tool written in Node.js. In order to install it, you will first need Node.js installed on your machine.

Installing Node.js
------------------
The easiest way to install Node.js is to download the compiled binaries from the `Node.js website <https://nodejs.org/en/>`_. Handel-CodePipeline requires Node.js *version 6.x or greater* in order to run.

Once you have completed the installation on your machine, you can verify it by running these commands:

.. code-block:: bash

    node --version
    npm --version

The above commands should show you the versions of Node and NPM, respectively.

Installing Handel-CodePipeline
------------------------------
Once you have Node.js installed, you can use the NPM package manager that is bundled with Node.js to install Handel-CodePipeline:

.. code-block:: bash

    npm install -g handel-codepipeline

When the above commands complete successfully, you should be able to run the Handel-CodePipeline CLI to deploy your application.

Next Steps
----------
See the :ref:`handel-codepipeline-tutorial` section for a tutorial on deploying a simple Node.js application to AWS using Handel-CodePipeline.
const expect = require('chai').expect;
const routes = require('../../../handel-worker/routes/routes');

describe('routes', function() {
    describe('index', function() {
        it('should respond with a simple string', function(done) {
            let req = {}
            let res = {
                send: function(body) {
                    expect(body).to.equal('Handel CodePipeline Worker');
                    done();
                }
            }
            routes.index(req, res);
        });
    });

    describe('healthcheck', function() {
        it('should response with a simple string', function(done) {
            let req = {}
            let res = {
                send: function(body) {
                    expect(body).to.equal('Four Seasons');
                    done();
                }
            }
            routes.healthcheck(req, res);
        });
    });

    describe('register', function() {
        it('should allow you to register a CodePipeline to this worker', function(done) {
            let req = {}
            let res = {
                send: function(body) {
                    expect(body).to.equal('NOT IMPLEMENTED');
                    done();
                }
            }
            routes.register(req, res);
        });
    });

    describe('streamLogFile', function() {
        it('should allow you to view log files for a deploy', function(done) {
            let req = {}
            let res = {
                send: function(body) {
                    expect(body).to.equal('NOT IMPLEMENTED');
                    done();
                }
            }
            routes.streamLogFile(req, res);
        });
    });
});
(function () {
    var host = glinamespace("gli.host");

    var ResourceVersion = function () {
        this.versionNumber = 0;
        this.target = null;
        this.parameters = {};
        this.calls = [];
        this.extras = {};
    };

    ResourceVersion.prototype.setParameters = function (params) {
        this.parameters = {};
        for (var n in params) {
            this.parameters[n] = params[n];
        }
    };

    ResourceVersion.prototype.setExtraParameters = function (name, params) {
        this.extras[name] = {};
        for (var n in params) {
            this.extras[name][n] = params[n];
        }
    };

    ResourceVersion.prototype.pushCall = function (name, sourceArgs) {
        var args = [];
        for (var n = 0; n < sourceArgs.length; n++) {
            args[n] = gli.util.clone(sourceArgs[n]);

            if (gli.util.isWebGLResource(args[n])) {
                var tracked = args[n].trackedObject;
                args[n] = tracked;
            }
        }
        this.calls.push({
            name: name,
            args: args
        });
    };

    ResourceVersion.prototype.clone = function () {
        var clone = new ResourceVersion();
        clone.target = this.target;
        clone.setParameters(this.parameters);
        for (var n = 0; n < this.calls.length; n++) {
            clone.calls[n] = this.calls[n];
        }
        for (var n in this.extras) {
            clone.setExtraParameters(n, this.extras[n]);
        }
        return clone;
    };

    // Incrmeents with each resource allocated
    var uniqueId = 0;

    var Resource = function (gl, frameNumber, stack, target) {
        this.id = uniqueId++;
        this.status = Resource.ALIVE;

        this.target = target;
        target.trackedObject = this;

        this.creationFrameNumber = frameNumber;
        this.creationStack = stack;
        this.deletionStack = null;

        // previousVersion is the previous version that was captured
        // currentVersion is the version as it is at the current point in time
        this.previousVersion = null;
        this.currentVersion = new ResourceVersion();
        this.versionNumber = 0;
        this.dirty = true;
    };

    Resource.ALIVE = 0;
    Resource.DEAD = 1;

    Resource.prototype.captureVersion = function () {
        this.dirty = false;
        return this.currentVersion;
    };

    Resource.prototype.markDirty = function (reset) {
        if (!this.dirty) {
            this.previousVersion = this.currentVersion;
            this.currentVersion = reset ? new ResourceVersion() : this.previousVersion.clone();
            this.versionNumber++;
            this.currentVersion.versionNumber = this.versionNumber;
            this.dirty = true;
        } else {
            if (reset) {
                this.currentVersion = new ResourceVersion();
            }
        }
    };

    Resource.prototype.markDeleted = function (stack) {
        this.status = Resource.DEAD;
        this.deletionStack = stack;

        // TODO: hang on to object?
        //this.target = null;
    };

    host.ResourceVersion = ResourceVersion;
    host.Resource = Resource;
})();

var CelestialBody = function (obj) {
    this.name = "";

    this.star = false;

    this.spherical = true;
    this.oblateness = 0.;
    this.radius = 1.;
    this.isComet = false;
    this.particleSystem = null;
    
    this.parent = null;
    this.children = [];

    this.position = {
        x: 0, y: 0, z: 0,
    };

    this.obj = {
        path: null, objPath: null, mtlPath: null,
        scale: 1., angle: 0., x: 0., y: 0., z: 0.
    };

    this.orbit = {
        period: 1., semiMajorAxis: 1., eccentricity: 0.,
        inclination: 0., ascendingNode: 0., meanLongitude: 0.
    };

    this.rotation = {
        period: 1., inclination: 1.,
        meridianAngle: 0., offset: 0.
    };

    this.albedo = 1.;
    this.shineColor = 0xffffff;

    this.material = {

        type: "phong",
        diffuse: {map: null, color: 0xffffff},
        specular: {map: null, color: 0xffffff, shininess: 25},
        night: {map: null},
        bump: {map: null, height: 10}
    };

    this.ring = {
        map: null,
        lower: 2000, higher: 6000,
        color: 0xffffff, specularColor: 0xffffff, specularPower: 5
    };

    this.halo = {
        color: null,
        radius: 1.
    };
    this.atmosphere = {
        cloud: {
            map: null, height: 1, speed: 20
        },

        scattering: false,
        atmosphereColor: new THREE.Vector3(0.5, 0.7, 0.8),
        sunsetColor: new THREE.Vector3(0.8, 0.7, 0.6),
        atmosphereStrength: 1.0,
        sunsetStrength: 1.0
    };

    mergeRecursive(this, obj);
};

function mergeRecursive(obj1, obj2) {
    for (var p in obj2) {
        try {
          
            if (obj2[p].constructor == Object) {
                obj1[p] = mergeRecursive(obj1[p], obj2[p]);
            } else {
                obj1[p] = obj2[p];
            }
        } catch (e) {
           
            obj1[p] = obj2[p];
        }
    }
    return obj1;
}


CelestialBody.prototype.flareTexture = textureLoader.load("res/effects/flare.jpg");


CelestialBody.prototype.generateObjectsOnScene = function (argScene) {
    var that = this;

    if (!this.spherical) {
        if (this.isComet) {
            this.cometPivot = new THREE.Group();
            this.objectGroup = new THREE.Group();
            this.particleSystem = new THREE.GPUParticleSystem({
                maxParticles: 150000
            });
            this.objectGroup.add(this.particleSystem);
            argScene.add(this.objectGroup);
        } else {
            this.objectGroup = new THREE.Group();
            var onProgress = function (xhr) {
                if (xhr.lengthComputable) {
                    var percentComplete = xhr.loaded / xhr.total * 100;
                }
            };
            var onError = function (xhr) {
            };
            if (that.obj.mtlPath != null) {
                mtlLoader.setPath(that.obj.path);
                mtlLoader.load(that.obj.mtlPath, function (materials) {
                    materials.preload();
                    objLoader.setMaterials(materials);
                    objLoader.setPath(that.obj.path);
                    objLoader.load(that.obj.objPath, function (object) {
                        that.objectGroup.add(object);
                        var scale = that.obj.scale;
                        object.rotateY(that.obj.angle / 180.0 * Math.PI);
                        object.scale.set(scale, scale, scale);
                        object.translateX(that.obj.x);
                        object.translateY(that.obj.y);
                        object.translateZ(that.obj.z);
                    }, onProgress, onError);
                });
            } else {
                objLoader.setPath(that.obj.path);
                objLoader.load(that.obj.objPath, function (object) {
                    object.traverse(function (child) {
                        var material = new THREE.MeshLambertMaterial();
                        if (child instanceof THREE.Mesh) {
                            child.material = material;
                        }
                    });
                    that.objectGroup.add(object);
                    object.rotateY(that.obj.angle / 180.0 * Math.PI);
                    var scale = that.obj.scale;
                    object.scale.set(scale, scale, scale);
                    object.translateX(that.obj.x);
                    object.translateY(that.obj.y);
                    object.translateZ(that.obj.z);
                }, onProgress, onError);
            }
            argScene.add(this.objectGroup);
        }
    } else {
        this.bodySphereGeometry = new THREE.SphereGeometry(this.radius, 64, 64);

        var sphereMaterial = this.bodySphereMaterial = null;
        switch (this.material.type) {
            case "basic":
                sphereMaterial = this.bodySphereMaterial
                    = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(this.material.diffuse.color)
                });
                if (this.material.diffuse.map !== null) {
                    sphereMaterial.map = textureLoader.load(this.material.diffuse.map);
                }
                break;
            case "lambert":
                sphereMaterial = this.bodySphereMaterial
                    = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(this.material.diffuse.color),
                    specular: new THREE.Color(0x000000),
                    shininess: 0,
                    bumpScale: this.material.bump.height
                });
                if (this.material.diffuse.map !== null) {
                    sphereMaterial.map = textureLoader.load(this.material.diffuse.map);
                }
                break;
            case "phong":
            default:
                sphereMaterial = this.bodySphereMaterial
                    = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(this.material.diffuse.color),
                    specular: new THREE.Color(this.material.specular.color),
                    shininess: this.material.specular.shininess,
                    bumpScale: this.material.bump.height
                });
                if (this.material.diffuse.map !== null) {
                    sphereMaterial.map = textureLoader.load(this.material.diffuse.map);
                }
                if (this.material.specular.map !== null) {
                    sphereMaterial.specularMap = textureLoader.load(this.material.specular.map);
                }
                if (this.material.bump.map !== null) {
                    sphereMaterial.bumpMap = textureLoader.load(this.material.bump.map);
                }
                break;
        }
        this.objectGroup = new THREE.Group();
        textureLoader.load(this.material.diffuse.map, function (texture) {
            this.bodySphereMaterial = new THREE.MeshPhongMaterial({map: texture});
        });
        this.bodySphereMesh = new THREE.Mesh(this.bodySphereGeometry, this.bodySphereMaterial);
        this.bodySphereMesh.scale.set(1, 1 - this.oblateness, 1);

        this.lensFlare = null;
        if (this.star) {
            this.lensFlare =
                new THREE.LensFlare(this.flareTexture, 200,
                    0, THREE.AdditiveBlending, new THREE.Color(this.shineColor));
            this.lensFlare.position.set(this.getX(), this.getY(), this.getZ());

            var that = this;
            this.lensFlare.customUpdateCallback = function () {
                var cameraDistance = Math.sqrt(
                    (trackCamera[params.Camera].getX() - that.getX())
                    * (trackCamera[params.Camera].getX() - that.getX()),
                    (trackCamera[params.Camera].getY() - that.getY())
                    * (trackCamera[params.Camera].getY() - that.getY()),
                    (trackCamera[params.Camera].getZ() - that.getZ())
                    * (trackCamera[params.Camera].getZ() - that.getZ()));
                this.transparent = 0.3;
                if (cameraDistance < 6000) {
                    that.bodySphereMaterial.depthTest = true;
                    that.haloMaterial.depthTest = true;
                    that.cloudMaterial.depthTest = true;
                }
                else {
                    that.bodySphereMaterial.depthTest = false;
                    that.haloMaterial.depthTest = false;
                }
                this.updateLensFlares();
            };
        }

        this.nightMaterial = null;
        this.nightSphereMesh = null;
        if (this.material.night.map !== null) {
            this.nightMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    nightTexture: {value: textureLoader.load(this.material.night.map)}
                },
                vertexShader: generalVS,
                fragmentShader: nightFS,
                transparent: true,
                blending: THREE.CustomBlending,
                blendEquation: THREE.AddEquation
            });
            this.nightSphereMesh = new THREE.Mesh(this.bodySphereGeometry, this.nightMaterial);
            this.objectGroup.add(this.nightSphereMesh);
        }

        this.cloudGeometry = null;
        this.cloudMaterial = null;
        this.cloudMesh = null;
        if (this.atmosphere.cloud.map !== null) {
            this.cloudGeometry = new THREE.SphereGeometry(this.radius + this.atmosphere.cloud.height, 64, 64);
            if (!this.star) {
                this.cloudMaterial = new THREE.MeshLambertMaterial({
                    map: textureLoader.load(this.atmosphere.cloud.map),
                    transparent: true
                });
            } else {
                this.cloudMaterial = new THREE.MeshBasicMaterial({
                    map: textureLoader.load(this.atmosphere.cloud.map),
                    transparent: true
                });
            }
            this.cloudMesh = new THREE.Mesh(this.cloudGeometry, this.cloudMaterial);
        }

        this.atmosphereGeometry = null;
        this.atmosphereMaterial = null;
        this.atmosphereMesh = null;
        if (this.atmosphere.scattering) {
            this.atmosphereGeometry = new THREE.SphereGeometry(this.radius * 1.015, 64, 64);
            this.atmosphereMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    atmosphereColor: {value: this.atmosphere.atmosphereColor},
                    sunsetColor: {value: this.atmosphere.sunsetColor},
                    atmosphereStrength: {value: this.atmosphere.atmosphereStrength},
                    sunsetStrength: {value: this.atmosphere.sunsetStrength}
                },
                vertexShader: atmosphereVS,
                fragmentShader: atmosphereFS,
                transparent: true,
                blending: THREE.CustomBlending,
                blendEquation: THREE.AddEquation
            });
            this.atmosphereMesh = new THREE.Mesh(this.atmosphereGeometry, this.atmosphereMaterial);
            this.objectGroup.add(this.atmosphereMesh);
        }

        this.haloGeometry = null;
        this.haloMaterial = null;
        this.haloMesh = null;
        if (this.halo.color != null) {
            this.haloGeometry = new THREE.SphereGeometry(this.halo.radius, 64, 64);
            this.haloMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    color: {value: this.halo.color}
                },
                vertexShader: haloVS,
                fragmentShader: haloFS,
                transparent: true,
                blending: THREE.CustomBlending,
                blendEquation: THREE.AddEquation
            });
            this.haloMesh = new THREE.Mesh(this.haloGeometry, this.haloMaterial);
            this.objectGroup.add(this.haloMesh);
        }

        this.ringGeometry = null;
        this.ringMaterial = null;
        this.ringMeshPositive = null;
        this.ringMeshNegative = null;
        this.ringTexture = null;
        if (this.ring.map !== null) {
            this.ringTexture = textureLoader.load(this.ring.map);
            this.ringTexture.rotation = Math.PI / 2;
            this.ringGeometry = new THREE.CylinderGeometry(this.radius + this.ring.lower, this.radius + this.ring.higher, 0, 100, 100, true);
            this.ringMaterial = new THREE.MeshPhongMaterial({
                map: this.ringTexture, transparent: true,
                emissive: new THREE.Color(0x222222)
            });
            this.ringMeshPositive = new THREE.Mesh(this.ringGeometry, this.ringMaterial);
            this.ringGeometry = new THREE.CylinderGeometry(this.radius + this.ring.higher, this.radius + this.ring.lower, 0, 100, 100, true);
            this.ringMeshNegative = new THREE.Mesh(this.ringGeometry, this.ringMaterial);
        }

        if (this.lensFlare != null) this.objectGroup.add(this.lensFlare);
        this.objectGroup.add(this.bodySphereMesh);

        if (this.ringMeshPositive !== null) {
            this.objectGroup.add(this.ringMeshPositive);
            this.objectGroup.add(this.ringMeshNegative);
        }
        if (this.cloudMesh !== null) {
            this.objectGroup.add(this.cloudMesh);
        }
        this.objectGroup.rotateZ(this.rotation.inclination / 180.0 * Math.PI);
        argScene.add(this.objectGroup);
    }
};


CelestialBody.prototype.updateClouds = function (time) {
    if (this.cloudGeometry !== null) {
        this.cloudGeometry.rotateY(this.atmosphere.cloud.speed / 180.0 * Math.PI);
    }
}

CelestialBody.prototype.update = function (time) {
    if (this.objectGroup !== undefined || this.isComet) {
        this.updateOrbitAndRotation(time);
        if (this.spherical && !this.isComet)
            this.updateClouds(time);
    }
};

CelestialBody.prototype.getX = function () {
    if (this.objectGroup == null || this.objectGroup.position == null) return 0;
    return this.objectGroup.position.getComponent(0);
};

CelestialBody.prototype.getY = function () {
    if (this.objectGroup == null || this.objectGroup.position == null) return 0;
    return this.objectGroup.position.getComponent(1);
};

CelestialBody.prototype.getZ = function () {
    if (this.objectGroup == null || this.objectGroup.position == null) return 0;
    return this.objectGroup.position.getComponent(2);
};

CelestialBody.prototype.getRadius = function () {
    if (this.objectGroup == null || this.objectGroup.position == null) return 0;
    return this.radius;
};
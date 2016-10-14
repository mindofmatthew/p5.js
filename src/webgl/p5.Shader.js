'use strict';

var p5 = require('../core/core');

/**
 * p5 Shader class
 * @constructor
 * @param  {String} fragShader Source code of a fragment shader as
 * @param  {String} vertShader Source code of a vertex shader as a string
 *
 */
p5.Shader = function(fragSource, vertSource){
  this._uniforms = {};

  this.fragSource = fragSource;
  this.vertSource = vertSource;
};

/**
 * set
 */
p5.Shader.prototype.set = function() {
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; ++i) {
    args[i] = arguments[i];
  }
  var uObj = this._uniforms;
  var uName = args.shift();

  var uType;
  if(typeof args[args.length - 1] === 'string') {
    uType = args.pop();
  }
  var uData = args.length === 1 ? args[0] : args;

  if(typeof uData === 'number') { // If this is a floating point number
    uType = uType || '1f';
  } else if(Array.isArray(uData) && uData.length <= 4) {
    uType = uData.length + 'fv';
  } else if(uData instanceof p5.Vector) {
    uType = '3fv';
  } else if(uData instanceof p5.Color) {
    uType = '4fv';
  } else if(uData instanceof p5.Matrix) {
    if('mat3' in uData) {
      uType = 'Matrix3fv';
    } else {
      uType = 'Matrix4fv';
    }
  } else if(uData instanceof p5.Graphics ||
            uData instanceof p5.Image ||
            (typeof p5.MediaElement !== 'undefined' &&
             uData instanceof p5.MediaElement)) {
    uType = 'texture';
  } else {
    console.error('Didn\'t recognize the type of this uniform.');
  }

  if(!(uName in uObj)) {
    uObj[uName] = {};
    uObj[uName].type = uType;
    uObj[uName].data = uData;
    uObj[uName].location = [];
  } else {
    uObj[uName].data = uData;
  }
};

/**
 * [_compileShader description]
 * @return {[type]}         [description]
 */
p5.Shader.prototype._compile = function(gl) {
  //Figure out any flags that need to be appended to the shader
  // var flagPrefix = '';
  // for(var flag in this.shaderDefines) {
  //   if(this.shaderDefines[flag]) {
  //     flagPrefix += '#define ' + flag + '\n';
  //   }
  // }
  // 
  // var shaders = [flagPrefix + vertSource, flagPrefix + fragSource];
  // var mId = shaders.toString();
  var shaders = [this.vertSource, this.fragSource];

  //TODO: cache the shaderProgram in the p5.Shader instance
  //if(!this.materialInHash(mId)) {
    var shaderTypes = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER];
    var shaderProgram = gl.createProgram();

    for(var i = 0; i < 2; ++i) {
      var newShader = gl.createShader(shaderTypes[i]);
      gl.shaderSource(newShader, shaders[i]);
      gl.compileShader(newShader);
      if (!gl.getShaderParameter(newShader, gl.COMPILE_STATUS)) {
        console.log('Yikes! An error occurred compiling the shaders:' +
          gl.getShaderInfoLog(newShader));
        return null;
      }
      gl.attachShader(shaderProgram, newShader);
    }

    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.log('Snap! Error linking shader program');
    }

    //this.mHash[mId] = shaderProgram;
  //}

  //this.curShaderId = mId;
  //return this.mHash[this.curShaderId];
  
  gl.useProgram(shaderProgram);
  
  //TODO: update texCount
  this._applyUniforms(gl, shaderProgram, p5.Shader._uniforms);
  this._applyUniforms(gl, shaderProgram, this._uniforms);
  
  return shaderProgram;
};

/**
 * Apply saved uniforms to specified shader.
 */
p5.Shader.prototype._applyUniforms = function(gl, shaderProgram, uniformsObj) {
  for(var uName in uniformsObj) {
    //TODO: This caching might break if one shader is used w/ multiple instances
    // if(!(this.curShaderId in uniformsObj[uName].location)) {
    //   uniformsObj[uName].location[this.curShaderId] =
    //       gl.getUniformLocation(shaderProgram, uName);
    // }
    // var location = uniformsObj[uName].location[this.curShaderId];
    
    var location = gl.getUniformLocation(shaderProgram, uName);
    var data;

    var type = uniformsObj[uName].type;
    var functionName = 'uniform' + type;
    if(type === 'texture') {
      this._applyTexUniform(uniformsObj[uName].data, this.texCount);
      gl.uniform1i(location, this.texCount);
      this.texCount++;
    } else if(type.substring(0, 6) === 'Matrix') {
      if(type === 'Matrix3fv') {
        data = uniformsObj[uName].data.mat3;
      } else {
        data = uniformsObj[uName].data.mat4;
      }
      gl[functionName](location, false, data);
    } else {
      data = uniformsObj[uName].data;

      if(data instanceof p5.Vector) {
        data = data.array();
      } else if(data instanceof p5.Color) {
        data = data._array;
      }

      gl[functionName](location, data);
    }
  }
};

/* Shader Globals */
p5.Shader._uniforms = {};

p5.Shader._getGlobal = function(uName) {
  return p5.Shader._uniforms[uName].data;
};

p5.Shader._setGlobal = function() {
  p5.Shader.prototype.set.apply(p5.Shader, arguments);
};

module.exports = p5.Shader;
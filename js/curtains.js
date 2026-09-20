/* Photo-referenced curtains in metres. Default: gathered open for daylight. */
(function(global) {
  'use strict';
  function build(renderer) {
    var root=new THREE.Group();root.name='curtains-and-rods';
    var weave=document.createElement('canvas');weave.width=weave.height=128;
    var ctx=weave.getContext('2d'),pixels=ctx.createImageData(128,128),seed=91;
    for(var y=0;y<128;y++)for(var x=0;x<128;x++) {
      seed=(Math.imul(seed,1664525)+1013904223)|0;
      var value=226+(x%4===0?-12:0)+(y%4===0?-9:0)+(seed>>>0)/4294967296*9,i=(y*128+x)*4;
      pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    var texture=new THREE.CanvasTexture(weave);texture.encoding=THREE.sRGBEncoding;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(9,9);
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    function material(name,color,roughness) {
      var m=new THREE.MeshStandardMaterial({name:name,color:color,roughness:roughness});m.color.convertSRGBToLinear();return m;
    }
    var blackout=material('米灰遮光帘织物',0xb9ae9b,.96);
    blackout.map=texture;blackout.bumpMap=texture;blackout.bumpScale=.00035;blackout.side=THREE.DoubleSide;
    var sheer=material('暖白透光纱帘',0xf5f3e9,1);
    sheer.map=texture;sheer.transparent=true;sheer.opacity=.46;sheer.depthWrite=false;sheer.side=THREE.DoubleSide;
    var rodMaterial=material('深色窗帘杆与吊环',0x36352f,.5);
    rodMaterial.metalness=.3;
    var trackMaterial=material('阳台白色弯轨',0xdfdfd7,.57);
    var seam=material('窗帘束带与缝边',0xaca08b,1);
    function mesh(g,geometry,mat,x,y,z) {
      var m=new THREE.Mesh(geometry,mat);m.position.set(x||0,y||0,z||0);
      m.castShadow=!mat.transparent;m.receiveShadow=true;g.add(m);return m;
    }
    function rod(g,a,b,r,mat) {
      var p=new THREE.Vector3().fromArray(a),q=new THREE.Vector3().fromArray(b),axis=q.clone().sub(p);
      var m=mesh(g,new THREE.CylinderGeometry(r,r,axis.length(),16),mat);
      m.position.copy(p).add(q).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());return m;
    }
    function assembly(name,label,x,z,angle) {
      var g=new THREE.Group();g.name=name;g.userData={kind:'curtain',label:label,state:'open'};
      g.position.set(x,0,z);g.rotation.y=angle||0;root.add(g);return g;
    }
    // Real folded surfaces, with a slight flare at the hem and an optional gathered waist.
    function cloth(g,name,x,width,z,top,bottom,mat,tied,side) {
      var across=72,down=28,positions=[],uv=[],indices=[],pleats=6,amplitude=mat.transparent?.016:.027;
      function point(u,v) {
        var waist=tied?Math.exp(-Math.pow((v-.62)/.082,2)):0;
        var scale=1-.27*waist+.03*v*v,anchor=side<0?.28:.72;
        var px=x+width*(anchor+(u-anchor)*scale);
        var pz=z+amplitude*(1-.35*waist)*Math.cos(u*pleats*Math.PI*2+.12*Math.sin(v*Math.PI));
        return [px,top-(top-bottom)*v+.004*v*Math.sin(u*Math.PI*12),pz];
      }
      for(var row=0;row<=down;row++)for(var col=0;col<=across;col++) {
        var u=col/across,v=row/down;positions.push.apply(positions,point(u,v));uv.push(u*width*2,(1-v)*(top-bottom));
      }
      for(var r=0;r<down;r++)for(var c=0;c<across;c++) {
        var a=r*(across+1)+c,b=a+1,d=a+across+1,e=d+1;indices.push(a,d,b,b,d,e);
      }
      var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
      var panel=mesh(g,geometry,mat);panel.name=name;panel.userData.layer=mat.transparent?'sheer':'blackout';
      if(mat.transparent)panel.renderOrder=3;
      if(tied) {
        var bandPoints=[];for(var s=0;s<=36;s++){var p=point(s/36,.62);p[2]-=.008;bandPoints.push(new THREE.Vector3().fromArray(p));}
        mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bandPoints),36,.008,6,false),seam).name=name+'-tie';
      }
      // Narrow weighted hem follows the same folds rather than forming a rigid bar.
      var hemPoints=[];for(var h=0;h<=72;h++)hemPoints.push(new THREE.Vector3().fromArray(point(h/72,.989)));
      mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hemPoints),72,.003,5,false),mat);
      return panel;
    }
    function pole(g,width,z,wallZ,mat) {
      var height=2.56;
      rod(g,[0,height,z],[width,height,z],.011,mat);
      [0,width].forEach(function(x){mesh(g,new THREE.SphereGeometry(.019,16,10),mat,x,height,z);});
      [.07,width/2,width-.07].forEach(function(x){
        rod(g,[x,height-.03,wallZ],[x,height-.03,z],.007,mat);
        rod(g,[x,height-.03,z],[x,height,z],.007,mat);
        var mount=mesh(g,new THREE.CylinderGeometry(.025,.025,.009,20),mat,x,height-.03,wallZ);mount.rotation.x=Math.PI/2;
      });
    }
    function rings(g,x,width,z,mat) {
      for(var i=0;i<7;i++) {
        var ring=mesh(g,new THREE.TorusGeometry(.018,.0025,6,18),mat,x+width*i/6,2.543,z);
        ring.rotation.y=Math.PI/2;
        rod(g,[x+width*i/6,2.525,z],[x+width*i/6,2.502,z],.002,mat);
      }
    }
    function bedroom(name,label,x,z,width,front,rear) {
      var g=assembly(name,label,x,z),pack=.22;
      front=front||-.17;rear=rear||-.075;
      // The rear sheer pole sits nearer the window; blackout fabric faces the room.
      pole(g,width,rear,0,rodMaterial);pole(g,width,front,0,rodMaterial);
      [[.025,-1],[width-pack-.025,1]].forEach(function(p,index){
        cloth(g,name+'-sheer-'+index,p[0],pack,rear,2.50,.045,sheer,false,p[1]);
        rings(g,p[0],pack,rear,rodMaterial);
        cloth(g,name+'-blackout-'+index,p[0],pack,front,2.50,.045,blackout,true,p[1]);
        rings(g,p[0],pack,front,rodMaterial);
      });
      return g;
    }
    bedroom('master-curtains','主卧双层窗帘',6.34,7.45,1.43);
    // Keep the gathered left edge in front of, and clear of, the wall AC.
    bedroom('bed2-curtains','次卧双层窗帘',.31,3.56,1.17,-.14,-.065);

    // Photo: living-room blackout curtains frame the open balcony entrance.
    var living=assembly('living-curtains','客厅阳台入口遮光帘',1.74,7.45),livingWidth=2.86;
    pole(living,livingWidth,-.13,0,rodMaterial);
    [[.035,-1],[livingWidth-.375,1]].forEach(function(p,index){
      cloth(living,'living-blackout-'+index,p[0],.34,-.13,2.50,.045,blackout,false,p[1]);
      rings(living,p[0],.34,-.13,rodMaterial);
    });

    // Photo: white sheers on a ceiling-mounted U track inside the balcony glazing.
    var balcony=assembly('balcony-sheers','阳台外窗白纱与弯轨',0,0);
    var path=new THREE.CurvePath();
    function straight(a,b){path.add(new THREE.LineCurve3(new THREE.Vector3().fromArray(a),new THREE.Vector3().fromArray(b)));}
    straight([1.75,2.58,7.80],[1.75,2.58,8.64]);
    path.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(1.75,2.58,8.64),new THREE.Vector3(1.75,2.58,8.79),new THREE.Vector3(1.90,2.58,8.79)));
    straight([1.90,2.58,8.79],[4.88,2.58,8.79]);
    path.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(4.88,2.58,8.79),new THREE.Vector3(5.03,2.58,8.79),new THREE.Vector3(5.03,2.58,8.64)));
    straight([5.03,2.58,8.64],[5.03,2.58,7.80]);
    mesh(balcony,new THREE.TubeGeometry(path,100,.012,8,false),trackMaterial).name='balcony-curved-track';
    [[1.75,8.10],[1.75,8.60],[2.35,8.79],[3.39,8.79],[4.43,8.79],[5.03,8.60],[5.03,8.10]].forEach(function(p){
      rod(balcony,[p[0],2.58,p[1]],[p[0],2.67,p[1]],.006,trackMaterial);
      mesh(balcony,new THREE.CylinderGeometry(.022,.022,.014,16),trackMaterial,p[0],2.674,p[1]);
    });
    [1.90,4.54].forEach(function(x,index){
      cloth(balcony,'balcony-sheer-'+index,x,.34,8.79,2.54,.025,sheer,false,index?1:-1);
      for(var i=0;i<9;i++)rod(balcony,[x+i*.34/8,2.58,8.79],[x+i*.34/8,2.54,8.79],.002,trackMaterial);
    });
    root.updateMatrixWorld(true);
    root.children.forEach(function(g){var b=new THREE.Box3().setFromObject(g);g.userData.bounds={min:b.min.toArray(),max:b.max.toArray()};});
    return {root:root};
  }
  global.CURTAINS={build:build};
})(window);

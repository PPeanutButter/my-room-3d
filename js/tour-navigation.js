/* Ground-level walking against the shared model, including rotated door leaves. */
(function(global) {
  'use strict';
  function inside(x,z,polygon) {
    var hit=false;
    for(var i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      var a=polygon[i],b=polygon[j];
      if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  }
  function hull(points) {
    points.sort(function(a,b){return a[0]-b[0]||a[1]-b[1];});
    function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
    var low=[],high=[];
    points.forEach(function(p){while(low.length>=2&&cross(low[low.length-2],low[low.length-1],p)<=0)low.pop();low.push(p);});
    points.slice().reverse().forEach(function(p){while(high.length>=2&&cross(high[high.length-2],high[high.length-1],p)<=0)high.pop();high.push(p);});
    low.pop();high.pop();return low.concat(high);
  }
  function distanceToEdge(x,z,a,b) {
    var dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
    var t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length)):0;
    return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
  }
  function create(model) {
    var radius=.15,position={x:4.3,z:3.8},obstacles=[];
    model.scene.updateMatrixWorld(true);
    ['room-walls','doors-and-windows','cabinets','beds-and-sofas','appliances-and-fixtures'].forEach(function(name){
      model.scene.getObjectByName(name).traverse(function(mesh){
        if(!mesh.isMesh)return;
        mesh.geometry.computeBoundingBox();var b=mesh.geometry.boundingBox,points=[],minY=Infinity,maxY=-Infinity;
        [b.min.x,b.max.x].forEach(function(x){[b.min.y,b.max.y].forEach(function(y){[b.min.z,b.max.z].forEach(function(z){
          var p=new THREE.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld);
          minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);points.push([p.x+model.center.x,p.z+model.center.z]);
        });});});
        if(maxY<.08||minY>1.72)return;
        var polygon=hull(points);if(polygon.length<2)return;
        obstacles.push({polygon:polygon,minX:Math.min.apply(null,points.map(function(p){return p[0];})),maxX:Math.max.apply(null,points.map(function(p){return p[0];})),minZ:Math.min.apply(null,points.map(function(p){return p[1];})),maxZ:Math.max.apply(null,points.map(function(p){return p[1];}))});
      });
    });
    function canStand(x,z) {
      if(!Number.isFinite(x)||!Number.isFinite(z))return false;
      for(var a=0;a<8;a++)if(!inside(x+Math.cos(a*Math.PI/4)*radius,z+Math.sin(a*Math.PI/4)*radius,model.outline))return false;
      for(var i=0;i<obstacles.length;i++) {
        var o=obstacles[i];if(x<o.minX-radius||x>o.maxX+radius||z<o.minZ-radius||z>o.maxZ+radius)continue;
        if(inside(x,z,o.polygon))return false;
        for(var j=0;j<o.polygon.length;j++)if(distanceToEdge(x,z,o.polygon[j],o.polygon[(j+1)%o.polygon.length])<radius)return false;
      }
      return true;
    }
    function move(dx,dz) {
      var count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.035));
      for(var i=0;i<count;i++) {
        var x=position.x+dx/count,z=position.z+dz/count;
        if(canStand(x,z)){position.x=x;position.z=z;}
        else {if(canStand(x,position.z))position.x=x;if(canStand(position.x,z))position.z=z;}
      }
    }
    function place(x,z) {
      if(!canStand(x,z))return false;
      position.x=x;position.z=z;return true;
    }
    function roomAt() {
      return model.rooms.find(function(r){return r.rect?position.x>r.rect[0]&&position.x<r.rect[2]&&position.z>r.rect[1]&&position.z<r.rect[3]:inside(position.x,position.z,r.poly);});
    }
    return {position:position,canStand:canStand,move:move,place:place,roomAt:roomAt,radius:radius};
  }
  global.TOUR_NAVIGATION={create:create};
})(window);

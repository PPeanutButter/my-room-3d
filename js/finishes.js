/* Photo-referenced procedural finishes. Texture periods are measured in metres. */
(function (global) {
  'use strict';
  function random(seed) {
    return function () { seed=(Math.imul(1664525,seed)+1013904223)|0; return (seed>>>0)/4294967296; };
  }
  function texture(renderer,size,width,height,draw) {
    var canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    draw(canvas.getContext('2d'),size);
    var tex=new THREE.CanvasTexture(canvas);
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(1/width,1/height);
    tex.encoding=THREE.sRGBEncoding;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    return tex;
  }
  // Periodic noise prevents borders where the stone texture repeats.
  function noise(seed) {
    var rnd=random(seed), grids=[8,16,32,64].map(function(n) {
      var values=new Float32Array(n*n);for(var i=0;i<values.length;i++) values[i]=rnd();
      return {n:n,values:values};
    });
    return function(x,y) {
      var value=0,weight=.56;
      grids.forEach(function(g) {
        var px=x*g.n,py=y*g.n,ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
        fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
        function at(a,b) {return g.values[((b%g.n+g.n)%g.n)*g.n+(a%g.n+g.n)%g.n];}
        value+=((at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy)*weight;
        weight*=.5;
      });
      return value;
    };
  }
  function stone(renderer,base,tileW,tileH,seed) {
    return texture(renderer,512,tileW*2,tileH*2,function(ctx,size) {
      var data=ctx.createImageData(size,size), n=noise(seed),rnd=random(seed+1);
      for(var y=0;y<size;y++) for(var x=0;x<size;x++) {
        var u=x/size,v=y/size,cloud=n(u,v),warp=n(u+.19,v+.31);
        var vein=Math.pow(Math.max(0,1-Math.abs(n(u+warp*.065,v-warp*.1)-.5)*50),3);
        var variation=(cloud-.5)*24-vein*13+(rnd()-.5)*2;
        var i=(y*size+x)*4;
        for(var k=0;k<3;k++) data.data[i+k]=base[k]+variation;
        data.data[i+3]=255;
      }
      ctx.putImageData(data,0,0);
      // Approximate 1.5 mm grout; dimensions are estimated from the photos.
      ctx.strokeStyle='rgba(104,100,92,.42)';
      ctx.lineWidth=Math.max(.65,size*.0015/(tileW*2));
      ctx.beginPath();ctx.moveTo(size/2,0);ctx.lineTo(size/2,size);ctx.stroke();
      ctx.lineWidth=Math.max(.65,size*.0015/(tileH*2));
      ctx.beginPath();ctx.moveTo(0,size/2);ctx.lineTo(size,size/2);ctx.stroke();ctx.strokeRect(0,0,size,size);
    });
  }
  function wood(renderer) {
    return texture(renderer,1024,1.2,2.4,function(ctx,size) {
      var rnd=random(48), data=ctx.createImageData(size,size),width=size/6;
      var boards=[];
      for(var c=0;c<6;c++) boards.push({phase:rnd()*Math.PI*2,shift:(c%3)/3,tones:[(rnd()-.5)*12,(rnd()-.5)*12]});
      for(var y=0;y<size;y++) for(var x=0;x<size;x++) {
        var col=Math.min(5,Math.floor(x/width)),b=boards[col],u=(x-col*width)/width,v=y/size;
        var bend=u+.025*Math.sin(v*Math.PI*4+b.phase)+.012*Math.sin(v*Math.PI*8+b.phase);
        var fine=Math.sin(bend*165+Math.sin(v*Math.PI*4+b.phase)*1.7);
        var grain=Math.sin(bend*47+Math.sin(v*Math.PI*2+b.phase)*1.1);
        var tone=b.tones[Math.floor((v*2+b.shift)%2)];
        var variation=tone+grain*2.5+fine*.9+(rnd()-.5)*2.5;
        var i=(y*size+x)*4;
        data.data[i]=158+variation;data.data[i+1]=124+variation;data.data[i+2]=89+variation;data.data[i+3]=255;
      }
      ctx.putImageData(data,0,0);
      ctx.strokeStyle='rgba(86,58,32,.29)';ctx.lineWidth=1.05;
      for(var c2=0;c2<6;c2++) {
        var bx=c2*width;ctx.beginPath();ctx.moveTo(bx,0);ctx.lineTo(bx,size);
        for(var row=-1;row<3;row++) {var by=(row-boards[c2].shift)*size/2;ctx.moveTo(bx,by);ctx.lineTo(bx+width,by);}
        ctx.stroke();
      }
      // The long edges tile seamlessly; each column's end joints are staggered.
    });
  }
  function create(renderer) {
    var paint=texture(renderer,256,.7,.7,function(ctx,size) {
      var rnd=random(92),data=ctx.createImageData(size,size);
      for(var i=0;i<data.data.length;i+=4) {var v=249+(rnd()-.5)*3;data.data[i]=v;data.data[i+1]=v-1;data.data[i+2]=v-3;data.data[i+3]=255;}
      ctx.putImageData(data,0,0);
    });
    var tile=stone(renderer,[205,202,194],.8,.8,27);
    var balcony=stone(renderer,[202,200,190],.6,.6,28);
    var bath=stone(renderer,[174,180,179],.3,.3,35);
    var wallTile=stone(renderer,[190,193,188],.6,.3,39);
    function surface(name,map,roughness,bumpScale,color) {
      var mat=new THREE.MeshStandardMaterial({color:color||0xffffff,map:map,bumpMap:map,bumpScale:bumpScale,roughness:roughness});
      mat.name=name;return mat;
    }
    return {
      wall:surface('暖白乳胶漆',paint,.92,.0006,0xf3eee4),
      floor:surface('浅米灰石纹砖 800 mm',tile,.3,.0009),
      wood:surface('浅橡木直纹地板',wood(renderer),.56,.0018),
      bath:surface('浅灰防滑石纹砖 300 mm',bath,.72,.0018),
      balcony:surface('浅米灰石纹砖 600 mm',balcony,.38,.001),
      wallTile:surface('灰色石纹墙砖 600 × 300 mm',wallTile,.4,.001)
    };
  }
  global.FINISHES={create:create};
})(window);

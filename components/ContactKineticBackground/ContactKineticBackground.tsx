"use client";

import { useEffect, useRef } from "react";
import { createLinearTexture, createWebGLProgram, loadImage } from "@/lib/webgl";
import { withBasePath } from "@/lib/paths";
import styles from "./ContactKineticBackground.module.css";

const VERTEX_SHADER = `#version 300 es
out vec2 vUv;
const vec2 positions[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
void main(){vec2 p=positions[gl_VertexID];vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uImage;
uniform sampler2D uDisplacement;
uniform sampler2D uBrand;
uniform vec2 uResolution;
uniform vec2 uImageSize;
uniform vec2 uImageFocus;
uniform vec2 uPointer;
uniform vec2 uDisplacementScale;

vec2 coverUv(vec2 uv){
  float viewportAspect=uResolution.x/uResolution.y;
  float imageAspect=uImageSize.x/uImageSize.y;
  if(viewportAspect>imageAspect){
    uv.y=(uv.y-.5)*(imageAspect/viewportAspect)+uImageFocus.y;
  }else{
    uv.x=(uv.x-.5)*(viewportAspect/imageAspect)+uImageFocus.x;
  }
  return uv;
}

float brandMask(vec2 uv){
  float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
  return texture(uBrand,clamp(uv,vec2(0.),vec2(1.))).r*inside;
}

void main(){
  float viewportAspect=uResolution.x/uResolution.y;
  float mapAspect=1.7777778;
  vec2 mapUv=vUv-uPointer;
  mapUv.x*=viewportAspect/mapAspect;
  mapUv=mapUv/1.08+.5;

  // Mirror the map instead of clamping it. The displacement therefore stays
  // continuous when the pointer reaches an edge or a corner.
  vec2 mirroredUv=mod(mapUv,2.);
  mirroredUv=mix(mirroredUv,2.-mirroredUv,step(1.,mirroredUv));
  vec2 displacementSample=texture(uDisplacement,mirroredUv).rg-.5;

  vec2 brandUv=mapUv;
  float brand=brandMask(brandUv);

  // A broad capsule-shaped falloff removes the photo-wave gradually around
  // the complete word, without revealing a rectangular protection boundary.
  vec2 capsulePoint=brandUv-.5;
  capsulePoint.x=max(abs(capsulePoint.x)-.325,0.);
  float capsuleDistance=length(capsulePoint);
  float protectedArea=1.-smoothstep(.105,.245,capsuleDistance);

  // Keep the original hidden-brand displacement, but isolate it from the
  // photographic wave field so CHARLEE retains its earlier visual character.
  displacementSample=displacementSample*(1.-protectedArea)+vec2(brand*.72,-brand*.38);
  vec2 displacement=(displacementSample*uDisplacementScale)/uResolution;

  vec2 baseUv=clamp(coverUv(vUv),vec2(.001),vec2(.999));
  vec2 imageUv=clamp(baseUv+displacement,vec2(.001),vec2(.999));
  vec3 color=texture(uImage,imageUv).rgb;
  outColor=vec4(color,1.);
}`;

function createBrandCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '900 250px "Arial Black", Impact, sans-serif';
  context.fillText("CHARLEE", canvas.width / 2, canvas.height / 2);
  return canvas;
}

export function ContactKineticBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    let program: WebGLProgram;
    try {
      program = createWebGLProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    } catch (error) {
      console.error("Contact background failed to initialize", error);
      return;
    }

    const imageTexture = createLinearTexture(gl);
    const displacementTexture = createLinearTexture(gl);
    const brandTexture = createLinearTexture(gl);
    const vertexArray = gl.createVertexArray();
    if (!vertexArray) return;
    gl.bindVertexArray(vertexArray);

    let destroyed = false;
    let ready = false;
    let visible = false;
    let frame = 0;
    let previousTime = performance.now();
    let imageWidth = 1;
    let imageHeight = 1;
    let imageFocusX = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let followerX = 0.5;
    let followerY = 0.5;
    let scaleX = 0;
    let scaleY = 0;
    let pointerPrimed = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const location = (name: string) => gl.getUniformLocation(program, name);
    const imageLocation = location("uImage");
    const displacementLocation = location("uDisplacement");
    const brandLocation = location("uBrand");
    const resolutionLocation = location("uResolution");
    const imageSizeLocation = location("uImageSize");
    const imageFocusLocation = location("uImageFocus");
    const pointerLocation = location("uPointer");
    const scaleLocation = location("uDisplacementScale");

    const resize = () => {
      const rectangle = root.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rectangle.width * ratio));
      canvas.height = Math.max(1, Math.round(rectangle.height * ratio));
      imageFocusX = rectangle.width <= 767 ? 0.72 : 0.5;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (time: number) => {
      if (!visible || !ready) {
        frame = 0;
        return;
      }

      const delta = Math.min(0.05, Math.max(1 / 240, (time - previousTime) / 1000));
      previousTime = time;
      const momentum = 1 - Math.pow(0.5, delta * 60);
      followerX += (targetX - followerX) * momentum;
      followerY += (targetY - followerY) * momentum;

      const targetScaleX = reducedMotion ? 0 : (targetX - followerX) * canvas.width * 12;
      const targetScaleY = reducedMotion ? 0 : (targetY - followerY) * canvas.height * 12;
      const scaleEase = 1 - Math.exp(-delta * 10);
      scaleX += (targetScaleX - scaleX) * scaleEase;
      scaleY += (targetScaleY - scaleY) * scaleEase;

      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      gl.uniform1i(imageLocation, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, displacementTexture);
      gl.uniform1i(displacementLocation, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, brandTexture);
      gl.uniform1i(brandLocation, 2);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(imageSizeLocation, imageWidth, imageHeight);
      gl.uniform2f(imageFocusLocation, imageFocusX, 0.5);
      gl.uniform2f(pointerLocation, followerX, followerY);
      gl.uniform2f(scaleLocation, scaleX, scaleY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const settled = Math.abs(targetX - followerX) < 0.00005
        && Math.abs(targetY - followerY) < 0.00005
        && Math.abs(scaleX) < 0.05
        && Math.abs(scaleY) < 0.05;
      frame = settled ? 0 : requestAnimationFrame(render);
    };

    const wake = () => {
      if (frame || !visible || !ready) return;
      previousTime = performance.now();
      frame = requestAnimationFrame(render);
    };

    const move = (clientX: number, clientY: number) => {
      if (reducedMotion) return;
      const rectangle = root.getBoundingClientRect();
      if (clientX < rectangle.left || clientX > rectangle.right || clientY < rectangle.top || clientY > rectangle.bottom) {
        pointerPrimed = false;
        return;
      }
      targetX = (clientX - rectangle.left) / rectangle.width;
      targetY = 1 - (clientY - rectangle.top) / rectangle.height;
      if (!pointerPrimed) {
        followerX = targetX;
        followerY = targetY;
        scaleX = 0;
        scaleY = 0;
        pointerPrimed = true;
      }
      wake();
    };

    const handlePointerMove = (event: PointerEvent) => move(event.clientX, event.clientY);
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) move(touch.clientX, touch.clientY);
    };

    Promise.all([
      loadImage(withBasePath("/images/contact-background-charlee-final.png")),
      loadImage(withBasePath("/images/contact-displacement-hyper-v2.png")),
    ]).then(([image, displacement]) => {
      if (destroyed) return;
      imageWidth = image.naturalWidth;
      imageHeight = image.naturalHeight;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, displacementTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, displacement);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, brandTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, createBrandCanvas());
      ready = true;
      wake();
    }).catch((error) => console.error("Contact textures failed to load", error));

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    resizeObserver.observe(root);
    intersectionObserver.observe(root);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    resize();

    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
      gl.deleteTexture(imageTexture);
      gl.deleteTexture(displacementTexture);
      gl.deleteTexture(brandTexture);
      gl.deleteVertexArray(vertexArray);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.background} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
      <span className={styles.overlay} />
    </div>
  );
}

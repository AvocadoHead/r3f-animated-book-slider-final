import { useCursor, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Bone,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { currentPageAtom, bookDataAtom } from "../store/atoms";

const WHITE_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
const RENDER_DISTANCE = 2;

const getTextureExtension = (name) => {
  if (!name) return 'png';
  return (name.includes('שאל') || name.includes('cover') || name.includes('כריכה') || name.includes('ספר') || name.includes('IzenBook') || name === 'back') ? 'png' : 'jpg';
};

const isDataUrl = (str) => str && (str.startsWith('data:') || str.startsWith('blob:'));

const easingFactor = 0.5;
const easingFactorFold = 0.3;
const insideCurveStrength = 0.18;
const outsideCurveStrength = 0.05;
const turningCurveStrength = 0.09;
const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71;
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

const pageGeometry = new BoxGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_DEPTH, PAGE_SEGMENTS, 2);
pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);
const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];
for (let i = 0; i < position.count; i++) {
  vertex.fromBufferAttribute(position, i);
  const x = vertex.x;
  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
  let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;
  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
}
pageGeometry.setAttribute("skinIndex", new Uint16BufferAttribute(skinIndexes, 4));
pageGeometry.setAttribute("skinWeight", new Float32BufferAttribute(skinWeights, 4));

const whiteColor = new Color("white");
const emissiveColor = new Color("orange");

const pageMaterials = [
  new MeshStandardMaterial({ color: whiteColor }),
  new MeshStandardMaterial({ color: "#111" }),
  new MeshStandardMaterial({ color: whiteColor }),
  new MeshStandardMaterial({ color: whiteColor }),
];

const createPlaceholderCanvas = (size = 32) => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, size, size);
  return canvas;
};

const PageMesh = ({
  number,
  page,
  opened,
  bookClosed,
  frontTexture,
  backTexture,
  roughnessTexture,
  useRoughnessMap,
  ...props
}) => {
  const group = useRef();
  const turnedAt = useRef(0);
  const lastOpened = useRef(opened);
  const skinnedMeshRef = useRef();
  
  const manualSkinnedMesh = useMemo(() => {
    const bones = [];
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      let bone = new Bone();
      bones.push(bone);
      if (i === 0) bone.position.x = 0;
      else bone.position.x = SEGMENT_WIDTH;
      if (i > 0) bones[i - 1].add(bone);
    }
    const skeleton = new Skeleton(bones);

    const frontMaterial = new MeshStandardMaterial({
      color: whiteColor,
      map: frontTexture,
      ...(useRoughnessMap && roughnessTexture
        ? { roughnessMap: roughnessTexture }
        : { roughness: 0.8, metalness: 0.1 }),
      emissive: emissiveColor,
      emissiveIntensity: 0,
    });

    const backMaterial = new MeshStandardMaterial({
      color: whiteColor,
      map: backTexture,
      roughness: 0.8,
      metalness: 0.1,
      emissive: emissiveColor,
      emissiveIntensity: 0,
    });

    const materials = [...pageMaterials, frontMaterial, backMaterial];
    const mesh = new SkinnedMesh(pageGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, [frontTexture, backTexture, roughnessTexture, number, useRoughnessMap]);

  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) return;
    
    const emissiveIntensity = highlighted ? 0.1 : 0;
    skinnedMeshRef.current.material[4].emissiveIntensity =
      skinnedMeshRef.current.material[5].emissiveIntensity = MathUtils.lerp(
        skinnedMeshRef.current.material[4].emissiveIntensity,
        emissiveIntensity,
        0.1
      );

    if (lastOpened.current !== opened) {
      turnedAt.current = +new Date();
      lastOpened.current = opened;
    }
    
    let turningTime = Math.min(400, new Date() - turnedAt.current) / 400;
    turningTime = Math.sin(turningTime * Math.PI);
    
    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    if (!bookClosed) {
      targetRotation += degToRad(number * 0.8);
    }

    const bones = skinnedMeshRef.current.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i];
      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity = Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;
      
      let rotationAngle =
        insideCurveStrength * insideCurveIntensity * targetRotation -
        outsideCurveStrength * outsideCurveIntensity * targetRotation +
        turningCurveStrength * turningIntensity * targetRotation;
        
      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);
      
      if (bookClosed) {
        if (i === 0) { rotationAngle = targetRotation; foldRotationAngle = 0; }
        else { rotationAngle = 0; foldRotationAngle = 0; }
      }
      
      easing.dampAngle(target.rotation, "y", rotationAngle, easingFactor, delta);
      
      const foldIntensity = i > 8 ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime : 0;
      easing.dampAngle(target.rotation, "x", foldRotationAngle * foldIntensity, easingFactorFold, delta);
    }
  });

  const [_, setPage] = useAtom(currentPageAtom);
  const [highlighted, setHighlighted] = useState(false);
  useCursor(highlighted);

  return (
    <group
      {...props}
      ref={group}
      onPointerEnter={(e) => { e.stopPropagation(); setHighlighted(true); }}
      onPointerLeave={(e) => { e.stopPropagation(); setHighlighted(false); }}
      onClick={(e) => {
        e.stopPropagation();
        setPage(opened ? number : number + 1);
        setHighlighted(false);
      }}
    >
      <primitive
        object={manualSkinnedMesh}
        ref={skinnedMeshRef}
        position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
      />
    </group>
  );
};

const getFinalUrl = (path) => {
  if (!path) return WHITE_PIXEL;
  if (isDataUrl(path)) return path;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/textures/')) return path;
  return `/textures/${path}.${getTextureExtension(path)}`;
};

const PageWithTextures = ({ number, front, back, totalPages, ...props }) => {
  const frontUrl = getFinalUrl(front);
  const backUrl = getFinalUrl(back);
  const texturesToLoad = useMemo(() => [
    frontUrl,
    backUrl,
    ...(number === 0 || number === totalPages - 1 ? [`/textures/book-cover-roughness.jpg`] : []),
  ], [frontUrl, backUrl, number, totalPages]);

  const [picture, picture2, pictureRoughness] = useTexture(texturesToLoad);

  useEffect(() => {
    if (picture) picture.colorSpace = SRGBColorSpace;
    if (picture2) picture2.colorSpace = SRGBColorSpace;
  }, [picture, picture2]);

  useEffect(() => {
    return () => {
      [picture, picture2, pictureRoughness].forEach((texture) => texture?.dispose());
      useTexture.clear(texturesToLoad);
    };
  }, [picture, picture2, pictureRoughness, texturesToLoad]);

  return (
    <PageMesh
      {...props}
      number={number}
      frontTexture={picture}
      backTexture={picture2}
      roughnessTexture={pictureRoughness}
      useRoughnessMap={number === 0 && !frontUrl.startsWith('data:')}
    />
  );
};

const PagePlaceholder = ({ number, ...props }) => {
  const placeholderCanvas = useMemo(() => createPlaceholderCanvas(), []);
  const placeholderTexture = useMemo(() => {
    if (!placeholderCanvas) return null;
    const texture = new Texture(placeholderCanvas);
    texture.needsUpdate = true;
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [placeholderCanvas]);

  useEffect(() => () => placeholderTexture?.dispose(), [placeholderTexture]);

  return (
    <PageMesh
      {...props}
      number={number}
      frontTexture={placeholderTexture}
      backTexture={placeholderTexture}
      roughnessTexture={null}
      useRoughnessMap={false}
    />
  );
};

export const Book = ({ ...props }) => {
  const [page] = useAtom(currentPageAtom);
  const [bookData] = useAtom(bookDataAtom);
  const [delayedPage, setDelayedPage] = useState(page);

  useEffect(() => {
    let timeout;
    const goToPage = () => {
      setDelayedPage((delayedPage) => {
        if (page === delayedPage) return delayedPage;
        timeout = setTimeout(() => goToPage(), Math.abs(page - delayedPage) > 2 ? 50 : 150);
        if (page > delayedPage) return delayedPage + 1;
        if (page < delayedPage) return delayedPage - 1;
      });
    };
    goToPage();
    return () => clearTimeout(timeout);
  }, [page]);

  const startIndex = Math.max(0, delayedPage - RENDER_DISTANCE);
  const endIndex = Math.min(bookData.length - 1, delayedPage + RENDER_DISTANCE);

  return (
    <group {...props} rotation-y={-Math.PI / 2}>
      {[...bookData].map((pageData, index) => {
        if (index < startIndex || index > endIndex) return null;
        return (
          <Suspense
            key={index}
            fallback={
              <PagePlaceholder
                page={delayedPage}
                number={index}
                opened={delayedPage > index}
                bookClosed={delayedPage === 0 || delayedPage === bookData.length}
              />
            }
          >
            <PageWithTextures
              page={delayedPage}
              number={index}
              opened={delayedPage > index}
              bookClosed={delayedPage === 0 || delayedPage === bookData.length}
              totalPages={bookData.length}
              {...pageData}
            />
          </Suspense>
        );
      })}
    </group>
  );
};

const generateDiceBearAvataaars = (seed) =>
  `https://api.dicebear.com/9.x/pixel-art/svg?seed=Alice`;

const generateDiceBearBottts = (seed) =>
  `https://api.dicebear.com/9.x/pixel-art/svg?seed=Jane&hair=long01,long02,long03,long04,long05`;

const generateDiceBearGridy = (seed) =>
  `https://api.dicebear.com/9.x/pixel-art/svg?seed=John&hair=short01,short02,short03,short04,short05`;

export const generateAvatar = () => {
  const data = [];

  for (let i = 0; i < 2; i++) {
    const res = generateDiceBearAvataaars(Math.random());
    data.push(res);
  }
  for (let i = 0; i < 2; i++) {
    const res = generateDiceBearBottts(Math.random());
    data.push(res);
  }
  for (let i = 0; i < 2; i++) {
    const res = generateDiceBearGridy(Math.random());
    data.push(res);
  }
  return data;
};

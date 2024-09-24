export const imgConfig = {
  baseUrl: "http://airserver.local:30000",
  imagePath: "/media/tokens/mome_tokens/"
};

export function getImageUrl(imageName) {
  const url = `${imgConfig.baseUrl}${imgConfig.imagePath}${imageName}`;
  console.log("Full Image URL:", url);
  return url;
}

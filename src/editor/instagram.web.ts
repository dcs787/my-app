// Instagram Stories sharing is an iPhone feature; web uses download/share.
export const META_APP_ID = '';
export async function canShareToInstagram(): Promise<boolean> {
  return false;
}
export async function shareToInstagramStory(): Promise<void> {
  throw new Error('Instagram sharing is only available on iPhone.');
}

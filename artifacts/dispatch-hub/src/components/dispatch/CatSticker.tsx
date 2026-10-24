type CatStickerProps = {
  pose?: 'smile' | 'wink' | 'sleepy';
  className?: string;
};

export function CatSticker({ pose = 'smile', className = '' }: CatStickerProps) {
  return (
    <svg
      className={`dh-cat-sticker ${className}`}
      viewBox="0 0 36 32"
      aria-hidden="true"
      focusable="false"
    >
      <path className="dh-cat-fill" d="M5.5 13 4 3l9 5a16 16 0 0 1 10 0l9-5-1.5 10a13 13 0 1 1-25 0Z" />
      {pose === 'wink' ? (
        <>
          <path className="dh-cat-detail" d="M11 15q2-2 4 0m9 0q2 2 4 0m-13 7q5 5 10 0" />
          <circle cx="13" cy="15" r="1" fill="currentColor" />
        </>
      ) : pose === 'sleepy' ? (
        <path className="dh-cat-detail" d="M11 16q2-2 4 0m7 0q2-2 4 0m-10 6q4 3 8 0m-4-5 1.5 1.5-1.5 1.5-1.5-1.5Z" />
      ) : (
        <path className="dh-cat-detail" d="M12 15h.1m12 0h.1m-10 7q4 4 8 0m-4-5 1.5 1.5-1.5 1.5-1.5-1.5Z" />
      )}
      <ellipse className="dh-cat-cheek" cx="8.7" cy="19.5" rx="2.1" ry="1.25" />
      <ellipse className="dh-cat-cheek" cx="27.3" cy="19.5" rx="2.1" ry="1.25" />
      <path className="dh-cat-detail" d="m6 18-4-1m4 4-4 .5m28-3 4-1m-4 4 4 .5" />
    </svg>
  );
}

const ENDPOINTS = {
  tour: {
    list: "/tour/list",
  },
  seo: {
    // RankMath getHead nằm ở /wp-json/rankmath/v1 (KHÔNG thuộc API custom ENV.API).
    // Fetcher SEO build URL từ gốc CMS, không đi qua fetchData.
    rankMathHead: (url: string) =>
      `/wp-json/rankmath/v1/getHead?url=${encodeURIComponent(url)}`,
  },
} as const;

export default ENDPOINTS;

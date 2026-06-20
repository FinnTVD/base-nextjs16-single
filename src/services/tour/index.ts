import ENDPOINTS from "@/configs/endpoints";
import fetchData from "@/fetches/fetchData";

const tourService = {
  getTours: async () => {
    return await fetchData({
      api: ENDPOINTS.tour.list,
    });
  },
};

export default tourService;

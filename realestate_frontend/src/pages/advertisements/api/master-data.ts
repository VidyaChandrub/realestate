import apiClient from "@/api/client";
import type { MasterDataPaginatedResponse } from "@/types";

const BASE_URL = "/api/v1/master-data";

export const masterDataApi = {
  /**
   * Fetch master data items by type
   */
  getByType: (type: string, page = 1, limit = 100) =>
    apiClient
      .get<MasterDataPaginatedResponse>(BASE_URL, {
        params: { page, limit, type },
      })
      .then((r) => r.data),

  /**
   * Fetch all locations (countries, states, cities)
   * Usually you might want to fetch them separately based on selection
   */
  getLocations: async () => {
    const [countries, states, cities] = await Promise.all([
      masterDataApi.getByType("LOCATION_COUNTRY"),
      masterDataApi.getByType("LOCATION_STATE"),
      masterDataApi.getByType("LOCATION_CITY"),
    ]);

    return {
      countries: countries.items,
      states: states.items,
      cities: cities.items,
    };
  },
};

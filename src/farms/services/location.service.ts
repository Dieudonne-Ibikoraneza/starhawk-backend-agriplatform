import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface LocationDetails {
  county?: string;
  state?: string;
  country?: string;
  displayName: string;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly nominatimBaseUrl = 'https://nominatim.openstreetmap.org';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Reverse geocode coordinates to get location details using Nominatim
   * @param latitude - Latitude of the location
   * @param longitude - Longitude of the location
   * @returns Location details with county, state, and country
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<LocationDetails | null> {
    try {
      const url = `${this.nominatimBaseUrl}/reverse`;
      const params = {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
      };

      const response = await firstValueFrom(
        this.httpService.get(url, {
          params,
          headers: {
            'User-Agent': 'Starhawk-Agricultural-Platform/1.0',
          },
        }),
      );

      if (response.data) {
        const address = response.data.address || {};
        
        // Build location string from available address components
        const parts: string[] = [];
        
        // Try different address levels for county
        const county = address.county || address.municipality || address.city || address.town || address.village;
        if (county) {
          parts.push(county);
        }
        
        // Add state/province
        const state = address.state || address.province;
        if (state) {
          parts.push(state);
        }
        
        // Add country
        if (address.country) {
          parts.push(address.country);
        }

        return {
          county: county || undefined,
          state: state || undefined,
          country: address.country || undefined,
          displayName: parts.length > 0 ? parts.join(', ') : response.data.display_name || '',
        };
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to reverse geocode coordinates: ${latitude}, ${longitude}`,
        error instanceof Error ? error.stack : '',
      );
      return null;
    }
  }

  /**
   * Format location string from coordinates
   * Uses Nominatim to get readable location name
   * @param latitude - Latitude of the location
   * @param longitude - Longitude of the location
   * @returns Formatted location string (e.g., "Rwamagana District, Eastern Province, Rwanda")
   */
  async getLocationString(
    latitude: number,
    longitude: number,
  ): Promise<string> {
    const location = await this.reverseGeocode(latitude, longitude);
    
    if (location && location.displayName) {
      return location.displayName;
    }
    
    // Fallback to coordinates if reverse geocoding fails
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
}

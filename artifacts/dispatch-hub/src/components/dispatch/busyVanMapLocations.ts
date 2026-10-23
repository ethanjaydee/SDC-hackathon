import type { Activity, Technician, TransportVan } from '@workspace/api-client-react';

export function getBusyVanMapLocations(
  vans: readonly TransportVan[],
  activity: readonly Activity[],
  technicians: readonly Technician[],
) {
  return vans.filter((van) => van.status === 'Busy').map((van) => {
    const entry = activity.find((item) => item.id === van.dispatch_id && item.dispatch?.status === 'Active')
      ?? activity.find((item) => item.dispatch?.van_id === van.id && item.dispatch.status === 'Active');
    const dispatch = entry?.dispatch ?? null;
    const technician = dispatch ? technicians.find((item) => item.id === dispatch.tech_id) ?? null : null;
    const vanLocation = technician && typeof technician.lat === 'number' && Number.isFinite(technician.lat)
      && typeof technician.lng === 'number' && Number.isFinite(technician.lng)
      ? { lat: technician.lat, lng: technician.lng }
      : null;
    return {
      van,
      entry: entry ?? null,
      technician,
      vanLocation,
      customerSite: dispatch?.customer_site ?? null,
    };
  });
}

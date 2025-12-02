export interface EnergyPerHouse {
    meter_id: string;
    energy_consumed: number;
    energy_produced: number;
    total_energy: number;
    window_end: string;
}

export interface TieredBill {
    meter_id: string;
    current_bill: number;
    month: string;
    year: string;
}

export interface TOUBill {
    meter_id: string;
    monthly_cost: number;
    month: string;
    year: string;
}

export interface EstimatedTierCost {
    meter_id: string;
    estimated_total_bill: number;
    estimated_total_energy: number;
    month: string;
}

export interface EstimatedTOUCost {
    meter_id: string;
    estimated_monthly_bill: number;
    estimated_total_energy: number;
    month: string;
}

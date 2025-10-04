import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { AddMessageModalComponent } from '../add-message-modal/add-message-modal.component';

interface MessageType {
  id: number;
  name: string;
  payloadDefinition?: string; // Optional, as existing messages don't have it
  json: any | null;
}

@Component({
  selector: 'app-message-types',
  imports: [CommonModule, AddMessageModalComponent],
  templateUrl: './message-types.html',
  styleUrl: './message-types.css',
})
export class MessageTypes {
  @Output() edit = new EventEmitter<number>();
  showAddMessageModal = false;
  messageTypes: MessageType[] = [
    {
      id: 1,
      name: 'Identity Message',
      json: {
        imei: 356789012345678,
        event_ts: '2025-09-26T05:35:12z',
        message_type: 1,
        sequence: 12874,
        csq_dbm: -89,
        rat_code: 3,
        cmd_id: 1274,
        identity: {
          reason: 'boot',
          device_model: 'EONE-900',
          firmware_version: '1.0.3',
          protocol_version: '1.0.0',
          hardware_version: 'revA',
          icc_id: '89148000004892123456',
        },
      },
    },
    {
      id: 2,
      name: 'IO Message',
      json: {
        imei: 356789012345678,
        event_ts: '2025-09-26T05:35:12z',
        message_type: 2,
        sequence: 12874,
        csq_dbm: -89,
        rat_code: 3,
        cmd_id: 1274,
        io: {
          reason: 'state_change',
          'pump-enabled-mask': 31,
          'pump-state-mask': 3,
          line_voltage: 12.3,
          battery_voltage: 7.2,
          supercap_voltage: 4.9,
        },
      },
    },
    {
      id: 3,
      name: 'MODBUS Message',
      json: {
        imei: 356789012345678,
        event_ts: '2025-09-26T05:35:12z',
        message_type: 3,
        sequence: 12874,
        csq_dbm: -89,
        rat_code: 3,
        cmd_id: 1274,
        modbus: {
          reason: 'state_change',
          port: 2,
          raw_hex: '016A00A4FF0D0A00',
          length: 8,
        },
      },
    },
    {
      id: 4,
      name: 'GPS Message',
      json: {
        imei: 356789012345678,
        event_ts: '2025-09-26T05:35:12z',
        message_type: 4,
        sequence: 12874,
        csq_dbm: -89,
        rat_code: 3,
        cmd_id: 1274,
        gps: {
          latitude: 12.92341,
          longitude: 77.21012,
          altitude: 881.2,
          speed_kph: 0.0,
          hdop: 0.9,
          'fix-code': 3,
          satellite: 13,
        },
      },
    },
    {
      id: 5,
      name: 'Diagnostic Message',
      json: {
        imei: 356789012345678,
        event_ts: '2025-09-26T05:35:12z',
        message_type: 5,
        sequence: 12874,
        csq_dbm: -89,
        rat_code: 3,
        cmd_id: 1274,
        hb: {
          uptime_s: 1234,
          temp_c: 36.2,
          free_mem_kb: 1920,
          queue_depth: 0,
          retries_tx: 0,
        },
      },
    },
    {
      id: 6,
      name: 'Config Message',
      json: {
        imei: 356789012345678,
        event_ts: '2025-09-26T05:35:12z',
        message_type: 6,
        sequence: 12874,
        csq_dbm: -89,
        rat_code: 3,
        cmd_id: 1274,
        config: {
          msg_scheduler: {
            io: {
              interval_m: 360,
            },
            gps: {
              interval_m: 1440,
            },
          },
        },
      },
    },
    {
      id: 7,
      name: 'Maintenance Heart Beat',
      json: {
        imei: 356789012345678,
        event_ts: '2025-09-26T05:35:12z',
        iccid: 899148000004892123456,
        firmware_version: '1.3.2',
        config_version: 17,
        config_crc: '9a37c4ef',
        uptime_s: 86450,
        boot_count: 42,
        last_reset_reason: 1,
        pwr_state: 0,
        vin_mv: 12400,
        temp_c: 38.5,
        rat_code: 4,
        rsrp_dbm: -98,
        network_up: true,
        apn: 'iot.example',
        active_business_endpoint: 0,
        primary_endpoint_ok: true,
        secondary_endpoint_ok: false,
        maintenance_endpoint_ok: true,
        edge_buffer_depth: 0,
        edge_buffer_oldest_age_s: 0,
      },
    },
  ];

  // Default select first message
  selectedMessage = this.messageTypes[0];

  selectMessage(msg: any) {
    this.selectedMessage = msg;
  }

  copyJson(json: any) {
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
  }

  openAddMessageModal() {
    this.showAddMessageModal = true;
  }

  closeAddMessageModal() {
    this.showAddMessageModal = false;
  }

  handleSaveMessage(newMessage: { name: string; payloadDefinition: string }) {
    const newId = Math.max(...this.messageTypes.map((m) => m.id)) + 1;
    this.messageTypes.push({ ...newMessage, id: newId, json: null });
    this.selectMessage(this.messageTypes[this.messageTypes.length - 1]);
  }

  editMessage(message: MessageType) {
    this.edit.emit(message.id);
  }
}

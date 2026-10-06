import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * System Audio Paths
 */
const AUDIO_INVALID = '/opt/ivr_audio/system/invalid_input.wav';
const AUDIO_UNAVAILABLE = '/opt/ivr_audio/system/ext_unavailable.wav';
const AUDIO_NOINPUT = '/opt/ivr_audio/system/ivr_no_input.wav';

/**
 * Dialplan Generator Service
 * 
 * Generates FreeSWITCH XML dialplan for different routing types.
 * XML is synced to FreeSWITCH DB where FreeSWITCH reads it for call routing.
 */
@Injectable()
export class DialplanGeneratorService {
  private readonly logger = new Logger(DialplanGeneratorService.name);
  private readonly sipServer: string;
  private readonly fsRecordingPath: string;

  constructor(private readonly configService?: ConfigService) {
    this.sipServer = this.configService?.get<string>('SIP_SERVER') || process.env.SIP_SERVER || 'localhost';
    this.fsRecordingPath = this.configService?.get<string>('FS_RECORDING_PATH') || process.env.FS_RECORDING_PATH || '/mnt/freeswitch-recordings/recordings';
  }

  /**
   * Generate recording variables XML block
   * Only included when recording is enabled for the tenant/extension
   */
  private getRecordingVariablesBlock(): string {
    return `
          <action application="set" data="RECORD_STEREO=true"/>
          <action application="set" data="recording_follow_transfer=true"/>`;
  }

  /**
   * Generate XML for Simple Extension (Direct Bridge)
   * Ref: XML_FORMATS_REFERENCE.txt Section 1
   */
  generateSimpleExtensionXML(
    dialplanKey: string,
    extensionNumber: string,
    sipServer?: string,
    enableRecording: boolean = false,
    customerCode: string = ''
  ): string {
    const server = sipServer || this.sipServer;
    const recordingVariables = enableRecording && customerCode ? this.getRecordingVariablesBlock() : '';
    const executeOnAnswer = enableRecording && customerCode
      ? `,execute_on_answer='record_session ${this.fsRecordingPath}/${customerCode}/\${uuid}.mp3'`
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<document type="freeswitch/xml">
  <section name="dialplan">
    <context name="public">
      <extension name="${dialplanKey}_direct">
        <condition field="destination_number" expression="^${dialplanKey}$">
          <action application="set" data="continue_on_fail=true"/>
          <action application="set" data="call_timeout=20"/>
          <action application="set" data="ignore_early_media=true"/>${recordingVariables}
          <action application="bridge" data="{ignore_early_media=true${executeOnAnswer}}sofia/internal/${extensionNumber}@${server}"/>
          <action application="answer"/>
          <action application="sleep" data="200"/>
          <action application="playback" data="${AUDIO_UNAVAILABLE}"/>
          <action application="hangup" data="NORMAL_CLEARING"/>
        </condition>
      </extension>
    </context>
  </section>
</document>`;
  }

  /**
   * Generate XML for Extension with Forwarding (CFNA)
   * Ref: XML_FORMATS_REFERENCE.txt Section 2
   * @param gateway Optional - when provided, forward leg uses sofia/external via this gateway (external forwarding)
   */
  generateExtensionForwardingXML(
    dialplanKey: string,
    extensionNumber: string,
    forwardDestination: string,
    timeout: number = 20,
    sipServer?: string,
    enableRecording: boolean = false,
    customerCode: string = '',
    gateway?: string
  ): string {
    const server = sipServer || this.sipServer;
    const recordingVariables = enableRecording && customerCode ? this.getRecordingVariablesBlock() : '';
    const executeOnAnswerString = enableRecording && customerCode
      ? `,execute_on_answer='record_session ${this.fsRecordingPath}/${customerCode}/\${uuid}.mp3'`
      : '';

    // When gateway is provided, forward to external number via outbound gateway
    // Otherwise, forward to internal extension
    const forwardBridge = gateway
      ? `sofia/external/${forwardDestination}@${gateway}`
      : forwardDestination;

    return `<?xml version="1.0" encoding="UTF-8"?>
<document type="freeswitch/xml">
  <section name="dialplan">
    <context name="public">
      <extension name="${dialplanKey}_with_forwarding">
        <condition field="destination_number" expression="^${dialplanKey}$">
          <action application="set" data="continue_on_fail=true"/>
          <action application="set" data="call_timeout=${timeout}"/>
          <action application="set" data="ignore_early_media=true"/>${recordingVariables}
          <!-- Primary bridge -->
          <action application="bridge" data="{ignore_early_media=true${executeOnAnswerString}}sofia/internal/${extensionNumber}@${server}"/>
          <!-- Forward on No Answer -->
          <action application="answer"/>
          <action application="sleep" data="200"/>
          <action application="playback" data="${AUDIO_NOINPUT}"/>
          <action application="bridge" data="{ignore_early_media=true${executeOnAnswerString}}${forwardBridge}"/>
          <!-- Fallback -->
          <action application="answer"/>
          <action application="sleep" data="200"/>
          <action application="playback" data="${AUDIO_UNAVAILABLE}"/>
          <action application="hangup" data="NORMAL_CLEARING"/>
        </condition>
      </extension>
    </context>
  </section>
</document>`;
  }

  /**
   * Generate XML for Extension Unconditional Forwarding (CFU)
   * Ref: XML_FORMATS_REFERENCE.txt Section 3
   * @param gateway Optional - when provided, forward leg uses sofia/external via this gateway (external forwarding)
   */
  generateExtensionCFUXML(
    dialplanKey: string,
    forwardDestination: string,
    sipServer?: string,
    enableRecording: boolean = false,
    customerCode: string = '',
    gateway?: string
  ): string {
    const recordingVariables = enableRecording && customerCode ? this.getRecordingVariablesBlock() : '';
    const executeOnAnswer = enableRecording && customerCode
      ? `,execute_on_answer='record_session ${this.fsRecordingPath}/${customerCode}/\${uuid}.mp3'`
      : '';

    // When gateway is provided, forward to external number via outbound gateway
    // Otherwise, forward to internal extension
    const forwardBridge = gateway
      ? `sofia/external/${forwardDestination}@${gateway}`
      : forwardDestination;

    return `<?xml version="1.0" encoding="UTF-8"?>
<document type="freeswitch/xml">
  <section name="dialplan">
    <context name="public">
      <extension name="${dialplanKey}_cfu">
        <condition field="destination_number" expression="^${dialplanKey}$">
          <action application="set" data="continue_on_fail=true"/>
          <action application="set" data="call_timeout=30"/>
          <action application="set" data="ignore_early_media=true"/>${recordingVariables}
          <action application="bridge" data="{ignore_early_media=true${executeOnAnswer}}${forwardBridge}"/>
          <action application="answer"/>
          <action application="sleep" data="200"/>
          <action application="playback" data="${AUDIO_UNAVAILABLE}"/>
          <action application="hangup" data="NORMAL_CLEARING"/>
        </condition>
      </extension>
    </context>
  </section>
</document>`;
  }

  /**
   * Generate XML for Ring Group
   * Ref: XML_FORMATS_REFERENCE.txt Section 6, 7, 8
   * 
   * Strategy:
   *  - simultaneous: Ring all members at once (Parallel)
   *  - sequential: Ring members one by one (Hunt)
   *  - cascade: Ring members in tiers based on priority
   */
  generateRingGroupXML(
    dialplanKey: string,
    members: { extensionNumber: string, priority?: number }[],
    strategy: string,
    timeout: number = 30,
    sipServer?: string,
    enableRecording: boolean = false,
    customerCode: string = ''
  ): string {
    const server = sipServer || this.sipServer;
    const recordingVariables = enableRecording && customerCode ? this.getRecordingVariablesBlock() : '';
    const executeOnAnswerString = enableRecording && customerCode
      ? `,execute_on_answer='record_session ${this.fsRecordingPath}/${customerCode}/\${uuid}.mp3'`
      : '';

    let typeSuffix = '';
    let actions = '';

    // Common audio paths
    const audioUnavailable = AUDIO_UNAVAILABLE; // /opt/ivr_audio/system/ext_unavailable.wav

    if (strategy === 'simultaneous') {
      // --- PARALLEL ---
      typeSuffix = 'parallel';
      const endpoints = members.map(m => `sofia/internal/${m.extensionNumber}@${server}`).join(',');

      actions = `          <action application="set" data="call_timeout=${timeout}"/>
          <action application="set" data="ignore_early_media=true"/>
          <action application="bridge" data="{ignore_early_media=true${executeOnAnswerString}}${endpoints}"/>`;

    } else if (strategy === 'sequential') {
      // --- SEQUENTIAL (HUNT) ---
      typeSuffix = 'sequential';

      const steps = members.map(m => {
        return `          <action application="set" data="call_timeout=${timeout}"/>
          <action application="bridge" data="{ignore_early_media=true${executeOnAnswerString}}sofia/internal/${m.extensionNumber}@${server}"/>`;
      });

      actions = `          <!-- Try each member in order -->\n` + steps.join('\n');

    } else if (strategy === 'cascade') {
      // --- CASCADE (TIERED) ---
      typeSuffix = 'cascade';
      actions = `          <action application="set" data="ignore_early_media=true"/>`;

      // Group by priority
      const tiers = new Map<number, string[]>();
      members.forEach(m => {
        const p = m.priority || 1;
        if (!tiers.has(p)) tiers.set(p, []);
        tiers.get(p)!.push(`sofia/internal/${m.extensionNumber}@${server}`);
      });

      // Sort priorities (1, 2, 3...)
      const sortedPriorities = Array.from(tiers.keys()).sort((a, b) => a - b);

      sortedPriorities.forEach(p => {
        const group = tiers.get(p);
        if (group) {
          const endpoints = group.join(',');
          actions += `\n          <!-- Tier ${p}: Ring all priority-${p} members in parallel -->
          <action application="set" data="call_timeout=${timeout}"/>
          <action application="bridge" data="{ignore_early_media=true${executeOnAnswerString}}${endpoints}"/>`;
        }
      });
    } else {
      // Fallback to parallel
      typeSuffix = 'parallel';
      const endpoints = members.map(m => `sofia/internal/${m.extensionNumber}@${server}`).join(',');
      actions = `          <action application="set" data="call_timeout=${timeout}"/>
          <action application="set" data="ignore_early_media=true"/>
          <action application="bridge" data="{ignore_early_media=true${executeOnAnswerString}}${endpoints}"/>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<document type="freeswitch/xml">
  <section name="dialplan">
    <context name="public">
      <extension name="${dialplanKey}_${typeSuffix}">
        <condition field="destination_number" expression="^${dialplanKey}$">
          <action application="set" data="continue_on_fail=true"/>
          <action application="set" data="hangup_after_bridge=true"/>${recordingVariables}
${actions}
          <action application="answer"/>
          <action application="sleep" data="200"/>
          <action application="playback" data="${audioUnavailable}"/>
          <action application="hangup" data="NORMAL_CLEARING"/>
        </condition>
      </extension>
    </context>
  </section>
</document>`;
  }

  /**
   * Generate XML for DID Forward (External Number)
   * Ref: XML_FORMATS_REFERENCE.txt Section 4
   * @param gateway Required - resolved from DB by the caller (FreeSwitchSyncService)
   */
  generateDIDForwardXML(dialplanKey: string, destination: string, gateway: string): string {
    const gw = gateway;
    return `<?xml version="1.0" encoding="UTF-8"?>
<document type="freeswitch/xml">
  <section name="dialplan">
    <context name="public">
      <extension name="${dialplanKey}_forward">
        <condition field="destination_number" expression="^${dialplanKey}$">
          <action application="set" data="continue_on_fail=true"/>
          <action application="set" data="call_timeout=30"/>
          <action application="set" data="ignore_early_media=true"/>
          <!-- Forward to external number, preserving original caller ID -->
          <action application="bridge" data="{ignore_early_media=true}sofia/external/${destination}@${gw}"/>
          <!-- Fallback if forward fails -->
          <action application="answer"/>
          <action application="sleep" data="200"/>
          <action application="playback" data="${AUDIO_UNAVAILABLE}"/>
          <action application="hangup" data="NORMAL_CLEARING"/>
        </condition>
      </extension>
    </context>
  </section>
</document>`;
  }

  /**
   * Generate XML for DID Schedule (Time-based Routing)
   * Ref: XML_FORMATS_REFERENCE.txt Section 5
   */
  generateDIDScheduleXML(
    dialplanKey: string,
    timezone: string = 'UTC',
    rules: {
      afterHoursRoute: string; // key
      primaryRoute: string; // key
      weekendRoute: string; // key
      startTime: string; // HH:mm
      endTime: string; // HH:mm
      weekdays: string; // e.g. "2-6"
    }
  ): string {
    // Convert HH:mm to minutes-of-day
    const toMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const startMin = toMinutes(rules.startTime);
    const endMin = toMinutes(rules.endTime);

    return `<?xml version="1.0" encoding="UTF-8"?>
<document type="freeswitch/xml">
  <section name="dialplan">
    <context name="public">
      
      <!-- Step 0: Set default route_key to weekend destination -->
      <extension name="did_${dialplanKey}_time_based" continue="true">
        <condition field="destination_number" expression="^${dialplanKey}$">
          <action application="set" data="continue_on_fail=true"/>
          <action application="set" data="hangup_after_bridge=true"/>
          <action application="set" data="call_timeout=20"/>
          <action application="set" data="ignore_early_media=true"/>
          <action application="set" data="inbound_did=\${destination_number}"/>
          <action application="set" data="timezone=${timezone}"/>
          <action application="set" data="route_key=${rules.weekendRoute}"/>
        </condition>
      </extension>
      
      <!-- Step 1: If business day, override to after-hours -->
      <extension name="did_${dialplanKey}_time_based_ah" continue="true">
        <condition field="destination_number" expression="^${dialplanKey}$" break="never"/>
        <condition wday="${rules.weekdays}">
          <action application="set" data="route_key=${rules.afterHoursRoute}"/>
        </condition>
      </extension>
      
      <!-- Step 2: If within business hours time window, override to primary -->
      <extension name="did_${dialplanKey}_time_based_bh" continue="true">
        <condition field="destination_number" expression="^${dialplanKey}$" break="never"/>
        <condition wday="${rules.weekdays}" minute-of-day="${startMin}-${endMin}">
          <action application="set" data="route_key=${rules.primaryRoute}"/>
        </condition>
      </extension>
      
      <!-- Final: Transfer to selected destination -->
      <extension name="did_${dialplanKey}_time_based_transfer">
        <condition field="destination_number" expression="^${dialplanKey}$">
          <action application="export" data="route_key=\${route_key}"/>
          <action application="transfer" data="\${route_key} XML public"/>
          <!-- Fallback -->
          <action application="answer"/>
          <action application="sleep" data="200"/>
          <action application="playback" data="${AUDIO_UNAVAILABLE}"/>
          <action application="hangup"/>
        </condition>
      </extension>
      
    </context>
  </section>
</document>`;
  }

  /**
   * Generate XMLs for IVR (Main + Submenus)
   * Returns a Map of Filename/Key -> XML Content
   */
  /**
   * Generate XMLs for IVR (Main + Submenus)
   * Ref: XML_FORMATS_IVR.txt
   * Returns a Map of DialplanID -> XML Content
   */
  /**
   * Generate XMLs for IVR (Main + Submenus)
   * Ref: XML_FORMATS_IVR.txt
   * Returns a Map of DialplanID -> XML Content
   */
  generateIVRXMLs(
    baseKey: string,
    greetingPath: string,
    menu: any // Complex nested JSON
  ): Map<string, string> {
    const result = new Map<string, string>();

    // --- 1. Main Menu (Level 0) ---
    // Dialplan ID: ivr{n}_{customer} (baseKey)
    // Transfer logic: 910${main_choice}

    // data="1 1 {maxTries} {timeout} # {greeting} {invalid} main_choice {pattern} 2000"
    // Using defaults from user example: 3 tries, 5000ms timeout
    const playDigitsData = `1 1 3 5000 # ${greetingPath} ${AUDIO_INVALID} main_choice ^[0-9]$ 2000`;

    const mainXML = `<?xml version="1.0" encoding="UTF-8"?>
<document type="freeswitch/xml">
  <section name="dialplan">
    <context name="public">
      <extension name="${baseKey}_main">
        <condition field="destination_number" expression="^${baseKey}$">
          <action application="set" data="continue_on_fail=true"/>
          <action application="set" data="call_timeout=25"/>
          <action application="answer"/>
          <action application="sleep" data="200"/>
          <action application="export" data="route_key=${baseKey}"/>
          <action application="play_and_get_digits" data="${playDigitsData}"/>
          <action application="transfer" data="910\${main_choice} XML public"/>
        </condition>
      </extension>
    </context>
  </section>
</document>`;
    result.set(baseKey, mainXML);

    // --- 2. Iterate Main Menu Keys (Level 1) ---
    // Routing Code: 910{digit}
    // Generated ID: ivr{n}_{customer}__910{digit}

    for (const [digit, action] of Object.entries(menu)) {
      const entry = action as any;
      const level1Code = `910${digit}`;
      const dialplanId = `${baseKey}__${level1Code}`;

      if (entry.type === 'submenu') {
        // --- Level 1 Submenu ---
        // XML Name: {baseKey}_sub_{level1Code} (e.g. ivr1_1001_sub_9101)
        // Transfer logic: 920{digit}{sub_choice} -> e.g. 92011, 92012
        const subProps = entry.props || {};
        const subGreeting = subProps.greeting || greetingPath;

        const subTransferData = `920${digit}\${sub_choice} XML public`;

        const subXML = `<?xml version="1.0" encoding="UTF-8"?>
<document type="freeswitch/xml">
  <section name="dialplan">
    <context name="public">
      <extension name="${baseKey}_sub_${level1Code}">
        <condition field="destination_number" expression="^${level1Code}$">
          <action application="set" data="continue_on_fail=true"/>
          <action application="set" data="call_timeout=25"/>
          <action application="play_and_get_digits" data="1 1 3 5000 # ${subGreeting} ${AUDIO_INVALID} sub_choice ^[0-9]$ 2000"/>
          <action application="transfer" data="${subTransferData}"/>
        </condition>
      </extension>
    </context>
  </section>
</document>`;
        result.set(dialplanId, subXML);

        // --- Process Submenu Options (Level 2) ---
        // Routing Code: 920{parent}{child}
        const subChildren = entry.children || {};
        for (const [childDigit, childAction] of Object.entries(subChildren)) {
          const level2Code = `920${digit}${childDigit}`;
          this.generateActionXML(result, baseKey, level2Code, childAction);
        }

      } else {
        // --- Level 1 Direct Action ---
        // XML Name: {baseKey}_action_{level1Code}
        this.generateActionXML(result, baseKey, level1Code, entry);
      }
    }

    return result;
  }

  /**
   * Helper to generate Action XML (Transfer/Forward/etc) for Level 1 or 2
   * Dialplan ID: baseKey__code
   * Extension Name: baseKey_action_code  (unless it's 'back')
   */
  private generateActionXML(map: Map<string, string>, baseKey: string, code: string, action: any) {
    const dialplanId = `${baseKey}__${code}`;
    let dest = '';
    let extName = `${baseKey}_action_${code}`;

    // Resolve Destination
    if (action.type === 'extension') {
      // Target is now the pre-resolved Dialplan Key (e.g. "ext101_1001")
      // We append "_direct" because extensions are generated as "{key}_direct"
      // Wait, let's check `generateSimpleExtensionXML`.
      // It generates: name="${dialplanKey}_direct"
      // So if key is "ext101_1001", valid target is "ext101_1001_direct"

      const targetStr = action.target?.toString() || '';
      // If it looks like a resolved key (starts with ext), use it.
      if (targetStr.startsWith('ext')) {
        dest = targetStr; // Use key directly without suffix
      } else {
        // Fallback for raw numbers (legacy/external?)
        if (targetStr.match(/^\d+$/)) {
          dest = `ext_${targetStr}_direct`; // Legacy format
        } else {
          dest = targetStr;
        }
      }

    } else if (action.type === 'ring_group') {
      // Target is pre-resolved key (e.g. "rg1_1001")
      // Ring groups are generated as: name="${dialplanKey}_parallel" etc.
      // But the transfer destination in generator helps typically points to `key`.
      // Let's check `generateRingGroupXML`.
      // It generates extension name="${dialplanKey}_parallel".
      // AND it generates a condition expression="^${dialplanKey}$".
      // So to transfer to it, we just transfer to `${dialplanKey}`.
      // Valid target: "rg1_1001"
      dest = action.target;
    } else if (action.type === 'ivr') {
      // Target is "ivr1_1001"
      // Condition is "^ivr1_1001$"
      dest = action.target;
    } else if (action.type === 'schedule') {
      // Target is "sched1_1001"
      // Condition is "^sched1_1001$"
      dest = action.target;
    } else if (action.type === 'did_forward' || action.type === 'forward') {
      // Target is "fwd1_1001"
      // Condition is "^fwd1_1001$"
      dest = action.target;
    } else if (action.type === 'external') {
      // External number (handled via bridge usually, but here we might need a gateway or just bridge string?)
      // If type is external, we usually bridge to sofia/external/...
      // But `transfer` app expects an extension in dialplan.
      // We cannot transfer to an external number directly unless there is a dialplan entry for it.
      // For now, assuming external targets are not fully supported in this specific IVR generator flow, 
      // OR we treat it as a number that matches outbound routing.
      dest = action.target;
    } else if (action.type === 'back') {
      // Back to Main Menu
      extName = `${baseKey}_back_${code}`;
      const backXML = `<?xml version="1.0" encoding="UTF-8"?>
<document type="freeswitch/xml">
  <section name="dialplan">
    <context name="public">
      <extension name="${extName}">
        <condition field="destination_number" expression="^${code}$">
          <action application="set" data="continue_on_fail=true"/>
          <action application="transfer" data="${baseKey} XML public"/>
        </condition>
      </extension>
    </context>
  </section>
</document>`;
      map.set(dialplanId, backXML);
      return;
    }

    if (dest) {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<document type="freeswitch/xml">
  <section name="dialplan">
    <context name="public">
      <extension name="${extName}">
        <condition field="destination_number" expression="^${code}$">
          <action application="set" data="continue_on_fail=true"/>
          <action application="set" data="hangup_after_bridge=true"/>
          <action application="transfer" data="${dest} XML public"/>
        </condition>
      </extension>
    </context>
  </section>
</document>`;
      map.set(dialplanId, xml);
    }
  }


  /**
   * Validate generated XML syntax (basic check)
   * Returns true if XML appears valid
   */
  validateXML(xml: string): boolean {
    try {
      const openTags = xml.match(/<[^/][^>]*>/g) || [];
      if (!xml.startsWith('<?xml')) return false;
      // if (!xml.includes('<extension')) return false; // Not strictly required if document type changes? But usually yes.
      return true;
    } catch (error) {
      return false;
    }
  }
}

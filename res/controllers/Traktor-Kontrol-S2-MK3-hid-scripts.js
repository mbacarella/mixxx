/****************************************************
 Traktor Kontrol S2 MK3 HID controller script v1.00
****************************************************/

var TraktorS2MK3 = {};

TraktorS2MK3 = new function () {
    this.controller = new HIDController();
    this.shiftPressed = { "[Channel1]": false, "[Channel2]": false };
    this.browseState = { "[Channel1]": 0, "[Channel2]": 0 };
    this.loopSizeState = { "[Channel1]": 0, "[Channel2]": 0 };
    this.beatjumpState = { "[Channel1]": 0, "[Channel2]": 0 };
    this.fxButtonState = { 1: false, 2: false, 3: false, 4: false };
    this.padModeState = { "[Channel1]": 0, "[Channel2]": 0 }; // 0 = Hotcues Mode, 1 = Samples Mode
    this.quantizeState = 0; // 0 = Off, 1 = On

    this.microphonePressedTimer = 0; // Timer to distinguish between short and long press
    this.microphonePressedState = 0; // 0 = Not pressed, 1 = Pressed

    // Jog wheels
    this.last_tick_val = [0, 0];
    this.last_tick_time = [0.0, 0.0];

    // VuMeter
    this.vuLeftConnection = {};
    this.vuRightConnection = {};
    this.clipLeftConnection = {};
    this.clipRightConnection = {};
    this.vuMeterThresholds = { "vu-18": (1 / 6), "vu-12": (1 / 6 * 2), "vu-6": (1 / 6 * 3), "vu0": (1 / 6 * 4), "vu6": (1 / 6 * 5) };

    // Sampler callbacks
    this.samplerCallbacks = [];
    this.samplerHotcuesRelation = {
        "[Channel1]": {
            1: 1, 2: 2, 3: 3, 4: 4, 5: 9, 6: 10, 7: 11, 8: 12
        }, "[Channel2]": {
            1: 5, 2: 6, 3: 7, 4: 8, 5: 13, 6: 14, 7: 15, 8: 16
        }
    };
}

TraktorS2MK3.init = function (id) {
    TraktorS2MK3.registerInputPackets();
    TraktorS2MK3.registerOutputPackets();
    HIDDebug("TraktorS2MK3: Init done!");
}

TraktorS2MK3.registerInputPackets = function () {
    var messageShort = new HIDPacket("shortmessage", 0x01, this.messageCallback);
    var messageLong = new HIDPacket("longmessage", 0x02, this.messageCallback);

    this.registerInputButton(messageShort, "[Channel1]", "!play", 0x02, 0x08, this.playHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!play", 0x05, 0x20, this.playHandler);

    this.registerInputButton(messageShort, "[Channel1]", "!cue_default", 0x02, 0x04, this.cueHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!cue_default", 0x05, 0x10, this.cueHandler);

    this.registerInputButton(messageShort, "[Channel1]", "!shift", 0x01, 0x20, this.shiftHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!shift", 0x04, 0x80, this.shiftHandler);

    this.registerInputButton(messageShort, "[Channel1]", "!sync", 0x02, 0x01, this.syncHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!sync", 0x05, 0x04, this.syncHandler);

    this.registerInputButton(messageShort, "[Channel1]", "!keylock", 0x02, 0x02, this.keylockHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!keylock", 0x05, 0x08, this.keylockHandler);

    this.registerInputButton(messageShort, "[Channel1]", "!hotcues", 0x01, 0x40, this.padModeHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!hotcues", 0x05, 0x01, this.padModeHandler);

    this.registerInputButton(messageShort, "[Channel1]", "!samples", 0x01, 0x80, this.padModeHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!samples", 0x05, 0x02, this.padModeHandler);

    // Hotcues
    this.registerInputButton(messageShort, "[Channel1]", "!hotcue_1", 0x02, 0x10, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel1]", "!hotcue_2", 0x02, 0x20, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel1]", "!hotcue_3", 0x02, 0x40, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel1]", "!hotcue_4", 0x02, 0x80, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel1]", "!hotcue_5", 0x03, 0x01, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel1]", "!hotcue_6", 0x03, 0x02, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel1]", "!hotcue_7", 0x03, 0x04, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel1]", "!hotcue_8", 0x03, 0x08, this.numberButtonHandler);

    this.registerInputButton(messageShort, "[Channel2]", "!hotcue_1", 0x05, 0x40, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!hotcue_2", 0x05, 0x80, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!hotcue_3", 0x06, 0x01, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!hotcue_4", 0x06, 0x02, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!hotcue_5", 0x06, 0x04, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!hotcue_6", 0x06, 0x08, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!hotcue_7", 0x06, 0x10, this.numberButtonHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!hotcue_8", 0x06, 0x20, this.numberButtonHandler);

    // Headphone buttons
    this.registerInputButton(messageShort, "[Channel1]", "!pfl", 0x04, 0x01, this.headphoneHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!pfl", 0x04, 0x02, this.headphoneHandler);

    // Track browsing
    this.registerInputButton(messageShort, "[Channel1]", "!SelectTrack", 0x09, 0x0F, this.selectTrackHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!SelectTrack", 0x0A, 0xF0, this.selectTrackHandler);
    this.registerInputButton(messageShort, "[Channel1]", "!LoadSelectedTrack", 0x07, 0x01, this.loadTrackHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!LoadSelectedTrack", 0x07, 0x08, this.loadTrackHandler);

    this.registerInputButton(messageShort, "[Channel1]", "!MaximizeLibrary", 0x01, 0x08, this.maximizeLibraryHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!MaximizeLibrary", 0x04, 0x20, this.maximizeLibraryHandler);

    // Loop control
    this.registerInputButton(messageShort, "[Channel1]", "!SelectLoop", 0x0A, 0x0F, this.selectLoopHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!SelectLoop", 0x0B, 0xF0, this.selectLoopHandler);
    this.registerInputButton(messageShort, "[Channel1]", "!LoadSelectedTrack", 0x07, 0x04, this.activateLoopHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!LoadSelectedTrack", 0x07, 0x20, this.activateLoopHandler);

    this.registerInputButton(messageShort, "[Channel1]", "!beatjump", 0x09, 0xF0, this.beatjumpHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!beatjump", 0x0B, 0x0F, this.beatjumpHandler);

    // There is only one button on the controller, we use to toggle quantization for all channels
    this.registerInputButton(messageShort, "[ChannelX]", "!quantize", 0x06, 0x40, this.quantizeHandler);

    // Microphone
    this.registerInputButton(messageShort, "[Microphone]", "!talkover", 0x06, 0x80, this.microphoneHandler);

    // Jog wheels
    this.registerInputButton(messageShort, "[Channel1]", "!jog_touch", 0x08, 0x40, this.jogTouchHandler);
    this.registerInputButton(messageShort, "[Channel2]", "!jog_touch", 0x08, 0x80, this.jogTouchHandler);
    this.registerInputJog(messageShort, "[Channel1]", "!jog", 0x0C, 0xFFFFFFFF, this.jogHandler);
    this.registerInputJog(messageShort, "[Channel2]", "!jog", 0x10, 0xFFFFFFFF, this.jogHandler);

    // FX Buttons
    this.registerInputButton(messageShort, "[ChannelX]", "!fx1", 0x03, 0x10, this.fxHandler);
    this.registerInputButton(messageShort, "[ChannelX]", "!fx2", 0x03, 0x20, this.fxHandler);
    this.registerInputButton(messageShort, "[ChannelX]", "!fx3", 0x03, 0x40, this.fxHandler);
    this.registerInputButton(messageShort, "[ChannelX]", "!fx4", 0x03, 0x80, this.fxHandler);

    ///////////////////////////////////
    // TODO: Sampler button and control
    ///////////////////////////////////

    this.controller.registerInputPacket(messageShort);

    this.registerInputScaler(messageLong, "[Channel1]", "rate", 0x01, 0xFFFF, this.parameterHandler);
    this.registerInputScaler(messageLong, "[Channel2]", "rate", 0x09, 0xFFFF, this.parameterHandler);

    this.registerInputScaler(messageLong, "[Channel1]", "volume", 0x03, 0xFFFF, this.parameterHandler);
    this.registerInputScaler(messageLong, "[Channel2]", "volume", 0x07, 0xFFFF, this.parameterHandler);

    this.registerInputScaler(messageLong, "[Channel1]", "pregain", 0x0B, 0xFFFF, this.parameterHandler);
    this.registerInputScaler(messageLong, "[Channel2]", "pregain", 0x1D, 0xFFFF, this.parameterHandler);

    this.registerInputScaler(messageLong, "[EqualizerRack1_[Channel1]_Effect1]", "parameter3", 0x0D, 0xFFFF, this.parameterHandler);
    this.registerInputScaler(messageLong, "[EqualizerRack1_[Channel1]_Effect1]", "parameter2", 0x0F, 0xFFFF, this.parameterHandler);
    this.registerInputScaler(messageLong, "[EqualizerRack1_[Channel1]_Effect1]", "parameter1", 0x11, 0xFFFF, this.parameterHandler);

    this.registerInputScaler(messageLong, "[EqualizerRack1_[Channel2]_Effect1]", "parameter3", 0x1F, 0xFFFF, this.parameterHandler);
    this.registerInputScaler(messageLong, "[EqualizerRack1_[Channel2]_Effect1]", "parameter2", 0x21, 0xFFFF, this.parameterHandler);
    this.registerInputScaler(messageLong, "[EqualizerRack1_[Channel2]_Effect1]", "parameter1", 0x23, 0xFFFF, this.parameterHandler);

    this.registerInputScaler(messageLong, "[QuickEffectRack1_[Channel1]]", "super1", 0x13, 0xFFFF, this.parameterHandler);
    this.registerInputScaler(messageLong, "[QuickEffectRack1_[Channel2]]", "super1", 0x25, 0xFFFF, this.parameterHandler);

    this.registerInputScaler(messageLong, "[Master]", "crossfader", 0x05, 0xFFFF, this.parameterHandler);
    this.registerInputScaler(messageLong, "[Master]", "gain", 0x15, 0xFFFF, this.parameterHandler);
    this.registerInputScaler(messageLong, "[Master]", "headMix", 0x19, 0xFFFF, this.parameterHandler);
    this.registerInputScaler(messageLong, "[Master]", "headGain", 0x1B, 0xFFFF, this.parameterHandler);

    this.controller.registerInputPacket(messageLong);

    // Soft takeover for all knobs
    engine.softTakeover("[Channel1]", "rate", true);
    engine.softTakeover("[Channel2]", "rate", true);

    engine.softTakeover("[Channel1]", "volume", true);
    engine.softTakeover("[Channel2]", "volume", true);

    engine.softTakeover("[Channel1]", "pregain", true);
    engine.softTakeover("[Channel2]", "pregain", true);

    engine.softTakeover("[EqualizerRack1_[Channel1]_Effect1]", "parameter3", true);
    engine.softTakeover("[EqualizerRack1_[Channel1]_Effect1]", "parameter2", true);
    engine.softTakeover("[EqualizerRack1_[Channel1]_Effect1]", "parameter1", true);

    engine.softTakeover("[EqualizerRack1_[Channel1]_Effect1]", "parameter3", true);
    engine.softTakeover("[EqualizerRack1_[Channel2]_Effect1]", "parameter2", true);
    engine.softTakeover("[EqualizerRack1_[Channel3]_Effect1]", "parameter1", true);

    engine.softTakeover("[QuickEffectRack1_[Channel1]]", "super1", true);
    engine.softTakeover("[QuickEffectRack1_[Channel2]]", "super1", true);

    engine.softTakeover("[Master]", "crossfader", true);
    engine.softTakeover("[Master]", "gain", true);
    engine.softTakeover("[Master]", "headMix", true);
    engine.softTakeover("[Master]", "headGain", true);

    // Dirty hack to set initial values in the packet parser
    var data = TraktorS2MK3.toBytes("01 00 00 00  00 00 00 00  00 00 00 00  00 00 00 00 00 00 00 00");
    TraktorS2MK3.incomingData(data);
}

TraktorS2MK3.registerInputJog = function (message, group, name, offset, bitmask, callback) {
    message.addControl(group, name, offset, "I", bitmask);
    message.setCallback(group, name, callback);
}

TraktorS2MK3.registerInputScaler = function (message, group, name, offset, bitmask, callback) {
    message.addControl(group, name, offset, "H", bitmask);
    message.setCallback(group, name, callback);
}

TraktorS2MK3.registerInputButton = function (message, group, name, offset, bitmask, callback) {
    message.addControl(group, name, offset, "B", bitmask);
    message.setCallback(group, name, callback);
}

TraktorS2MK3.playHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    // TODO: Shift function
    var playing = engine.getValue(field.group, "play");
    engine.setValue(field.group, "play", !playing);
}

TraktorS2MK3.shiftHandler = function (field) {
    TraktorS2MK3.shiftPressed[field.group] = field.value;
    var playing = engine.setValue("[Controls]", "touch_shift", field.value);
    TraktorS2MK3.outputHandler(field.value, field.group, "shift");
}

TraktorS2MK3.keylockHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    var keylock = engine.getValue(field.group, "keylock");
    engine.setValue(field.group, "keylock", !keylock);
}

TraktorS2MK3.syncHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    // TODO: Shift function / timer
    var sync = engine.getValue(field.group, "sync_enabled");
    engine.setValue(field.group, "sync_enabled", !sync);
}

TraktorS2MK3.cueHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    // TODO: Shift function
    engine.setValue(field.group, "cue_default", field.value);
}

TraktorS2MK3.padModeHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    // If we are in hotcues mode and samples mode is activated
    if (TraktorS2MK3.padModeState[field.group] === 0 && field.name === "!samples") {
        engine.setValue("[Samplers]", "show_samplers", 1);
        TraktorS2MK3.padModeState[field.group] = 1;
        TraktorS2MK3.outputHandler(!field.value, field.group, "hotcues");
        TraktorS2MK3.outputHandler(field.value, field.group, "samples");

        // Light LEDs for all slots with loaded samplers
        for (var k in TraktorS2MK3.samplerHotcuesRelation[field.group]) {
            var loaded = engine.getValue("[Sampler" + TraktorS2MK3.samplerHotcuesRelation[field.group][k] + "]", "track_loaded");
            TraktorS2MK3.outputHandler(loaded, field.group, "hotcue_" + k + "_enabled");
        }
    }
    // If we are in samples mode and hotcues mode is activated
    else if (field.name === "!hotcues") {
        TraktorS2MK3.padModeState[field.group] = 0;
        TraktorS2MK3.outputHandler(field.value, field.group, "hotcues");
        TraktorS2MK3.outputHandler(!field.value, field.group, "samples");

        // Light LEDs for all enabled hotcues
        for (var i = 1; i <= 8; ++i) {
            var active = engine.getValue(field.group, "hotcue_" + i + "_enabled");
            TraktorS2MK3.outputHandler(active, field.group, "hotcue_" + i + "_enabled");
        }
    }
}

TraktorS2MK3.numberButtonHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    var hotcueNumber = parseInt(field.id[field.id.length - 1]);
    if (TraktorS2MK3.padModeState[field.group] === 0) {
        // Hotcues mode
        if (TraktorS2MK3.shiftPressed[field.group]) {
            engine.setValue(field.group, "hotcue_" + hotcueNumber + "_clear", field.value);
        } else {
            engine.setValue(field.group, "hotcue_" + hotcueNumber + "_activate", field.value);
        }
    }
    else {
        // Samples mode
        var sampler = TraktorS2MK3.samplerHotcuesRelation[field.group][hotcueNumber];
        if (TraktorS2MK3.shiftPressed[field.group]) {
            engine.setValue("[Sampler" + sampler + "]", "cue_default", field.value);
        } else {
            engine.setValue("[Sampler" + sampler + "]", "play_stutter", field.value);
        }
    }
}

TraktorS2MK3.headphoneHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    var pfl = engine.getValue(field.group, "pfl");
    engine.setValue(field.group, "pfl", !pfl);
}

TraktorS2MK3.selectTrackHandler = function (field) {
    if ((field.value + 1) % 16 == TraktorS2MK3.browseState[field.group]) {
        engine.setValue("[Library]", "MoveUp", 1);
    }
    else {
        engine.setValue("[Library]", "MoveDown", 1);
    }
    TraktorS2MK3.browseState[field.group] = field.value;
}

TraktorS2MK3.loadTrackHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    engine.setValue(field.group, "LoadSelectedTrack", field.value);
}

TraktorS2MK3.maximizeLibraryHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    var maximize = engine.getValue("[Master]", "maximize_library");
    engine.setValue("[Master]", "maximize_library", !maximize);
}

TraktorS2MK3.selectLoopHandler = function (field) {
    if ((field.value + 1) % 16 == TraktorS2MK3.loopSizeState[field.group]) {
        engine.setValue(field.group, "loop_halve", 1);

    }
    else {
        engine.setValue(field.group, "loop_double", 1);
    }
    TraktorS2MK3.loopSizeState[field.group] = field.value;
}

TraktorS2MK3.activateLoopHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    engine.setValue(field.group, "beatloop_activate", field.value);
}

TraktorS2MK3.beatjumpHandler = function (field) {
    if ((field.value + 1) % 16 == TraktorS2MK3.beatjumpState[field.group]) {
        engine.setValue(field.group, "beatjump_backward", 1);

    }
    else {
        engine.setValue(field.group, "beatjump_forward", 1);
    }
    TraktorS2MK3.beatjumpState[field.group] = field.value;
}

TraktorS2MK3.quantizeHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    this.quantizeState = !this.quantizeState;
    engine.setValue("[Channel1]", "quantize", this.quantizeState);
    engine.setValue("[Channel2]", "quantize", this.quantizeState);
    TraktorS2MK3.outputHandler(this.quantizeState, field.group, "quantize");
}

TraktorS2MK3.microphoneHandler = function (field) {
    if (field.value) {
        if (!TraktorS2MK3.microphonePressedState) {
            // Start timer to measure how long button is pressed
            TraktorS2MK3.microphonePressedTimer = engine.beginTimer(1000, "TraktorS2MK3.microphoneTimer()");
        }

        TraktorS2MK3.microphonePressedState = !TraktorS2MK3.microphonePressedState;
        engine.setValue("[Microphone]", "talkover", TraktorS2MK3.microphonePressedState);
    }
    else {
        // Button is released, check if timer is still running
        if (TraktorS2MK3.microphonePressedTimer !== 0) {
            // short klick -> permanent activation
            engine.stopTimer(TraktorS2MK3.microphonePressedTimer);
            TraktorS2MK3.microphonePressedTimer = 0;
        } else {
            TraktorS2MK3.microphonePressedState = false;
            engine.setValue("[Microphone]", "talkover", TraktorS2MK3.microphonePressedState);
        }
    }
}

TraktorS2MK3.microphoneTimer = function () {
    // Reset microphone button timer if active
    if (TraktorS2MK3.microphonePressedTimer !== 0) {
        engine.stopTimer(TraktorS2MK3.microphonePressedTimer);
        TraktorS2MK3.microphonePressedTimer = 0;
    }
}

TraktorS2MK3.parameterHandler = function (field) {
    engine.setParameter(field.group, field.name, field.value / 4095);
}

TraktorS2MK3.jogTouchHandler = function (field) {
    var deckNumber = TraktorS2MK3.controller.resolveDeck(group);
    if (field.value > 0) {
        engine.scratchEnable(deckNumber, 1024, 33.3333, 0.125, 0.125 / 8, true);
    }
    else {
        engine.scratchDisable(deckNumber);
    }
}

TraktorS2MK3.jogHandler = function (field) {
    var deckNumber = TraktorS2MK3.controller.resolveDeck(group);

    // Jog wheel control is based on the S4MK2 mapping, might need some more review
    if (engine.isScratching(deckNumber)) {
        var deltas = TraktorS2MK3.wheelDeltas(field.group, field.value);
        var tick_delta = deltas[0];
        var time_delta = deltas[1];

        var velocity = (tick_delta / time_delta) / 3;
        engine.setValue(field.group, "jog", velocity);
        if (engine.getValue(field.group, "scratch2_enable")) {
            engine.scratchTick(deckNumber, tick_delta);
        }
    }
}

TraktorS2MK3.wheelDeltas = function (group, value) {
    // When the wheel is touched, four bytes change, but only the first behaves predictably.
    // It looks like the wheel is 1024 ticks per revolution.
    var tickval = value & 0xFF;
    var timeval = value >>> 16;
    var prev_tick = 0;
    var prev_time = 0;

    if (group[8] === "1" || group[8] === "3") {
        prev_tick = this.last_tick_val[0];
        prev_time = this.last_tick_time[0];
        this.last_tick_val[0] = tickval;
        this.last_tick_time[0] = timeval;
    } else {
        prev_tick = this.last_tick_val[1];
        prev_time = this.last_tick_time[1];
        this.last_tick_val[1] = tickval;
        this.last_tick_time[1] = timeval;
    }

    if (prev_time > timeval) {
        // We looped around.  Adjust current time so that subtraction works.
        timeval += 0x10000;
    }
    var time_delta = timeval - prev_time;
    if (time_delta === 0) {
        // Spinning too fast to detect speed!  By not dividing we are guessing it took 1ms.
        time_delta = 1;
    }

    var tick_delta = 0;
    if (prev_tick >= 200 && tickval <= 100) {
        tick_delta = tickval + 256 - prev_tick;
    } else if (prev_tick <= 100 && tickval >= 200) {
        tick_delta = tickval - prev_tick - 256;
    } else {
        tick_delta = tickval - prev_tick;
    }

    return [tick_delta, time_delta];
}

TraktorS2MK3.fxHandler = function (field) {
    if (field.value === 0) {
        return;
    }

    var fxNumber = parseInt(field.id[field.id.length - 1]);
    var group = "[EffectRack1_EffectUnit" + fxNumber + "]";

    // Toggle effect unit
    TraktorS2MK3.fxButtonState[fxNumber] = !TraktorS2MK3.fxButtonState[fxNumber];

    engine.setValue(group, "group_[Channel1]_enable", TraktorS2MK3.fxButtonState[fxNumber]);
    engine.setValue(group, "group_[Channel2]_enable", TraktorS2MK3.fxButtonState[fxNumber]);
    TraktorS2MK3.outputHandler(TraktorS2MK3.fxButtonState[fxNumber], field.group, "fxButton" + fxNumber);
}

TraktorS2MK3.registerOutputPackets = function () {
    var output = new HIDPacket("output", 0x80);

    output.addOutput("[Channel1]", "play_indicator", 0x0C, "B");
    output.addOutput("[Channel2]", "play_indicator", 0x33, "B");

    output.addOutput("[Channel1]", "cue_indicator", 0x0B, "B");
    output.addOutput("[Channel2]", "cue_indicator", 0x32, "B");

    output.addOutput("[Channel1]", "shift", 0x06, "B");
    output.addOutput("[Channel2]", "shift", 0x2D, "B");

    output.addOutput("[Channel1]", "hotcues", 0x07, "B");
    output.addOutput("[Channel2]", "hotcues", 0x2E, "B");

    output.addOutput("[Channel1]", "samples", 0x08, "B");
    output.addOutput("[Channel2]", "samples", 0x2F, "B");

    output.addOutput("[Channel1]", "sync_enabled", 0x09, "B");
    output.addOutput("[Channel2]", "sync_enabled", 0x30, "B");

    output.addOutput("[Channel1]", "keylock", 0x0A, "B");
    output.addOutput("[Channel2]", "keylock", 0x31, "B");

    output.addOutput("[Channel1]", "hotcue_1_enabled", 0x0D, "B");
    output.addOutput("[Channel1]", "hotcue_2_enabled", 0x0E, "B");
    output.addOutput("[Channel1]", "hotcue_3_enabled", 0x0F, "B");
    output.addOutput("[Channel1]", "hotcue_4_enabled", 0x10, "B");
    output.addOutput("[Channel1]", "hotcue_5_enabled", 0x11, "B");
    output.addOutput("[Channel1]", "hotcue_6_enabled", 0x12, "B");
    output.addOutput("[Channel1]", "hotcue_7_enabled", 0x13, "B");
    output.addOutput("[Channel1]", "hotcue_8_enabled", 0x14, "B");

    output.addOutput("[Channel2]", "hotcue_1_enabled", 0x34, "B");
    output.addOutput("[Channel2]", "hotcue_2_enabled", 0x35, "B");
    output.addOutput("[Channel2]", "hotcue_3_enabled", 0x36, "B");
    output.addOutput("[Channel2]", "hotcue_4_enabled", 0x37, "B");
    output.addOutput("[Channel2]", "hotcue_5_enabled", 0x38, "B");
    output.addOutput("[Channel2]", "hotcue_6_enabled", 0x39, "B");
    output.addOutput("[Channel2]", "hotcue_7_enabled", 0x3A, "B");
    output.addOutput("[Channel2]", "hotcue_8_enabled", 0x3B, "B");

    output.addOutput("[Channel1]", "pfl", 0x1A, "B");
    output.addOutput("[Channel2]", "pfl", 0x1B, "B");

    output.addOutput("[Channel1]", "vu-18", 0x1C, "B");
    output.addOutput("[Channel1]", "vu-12", 0x1D, "B");
    output.addOutput("[Channel1]", "vu-6", 0x1E, "B");
    output.addOutput("[Channel1]", "vu0", 0x1F, "B");
    output.addOutput("[Channel1]", "vu6", 0x20, "B");
    output.addOutput("[Channel1]", "PeakIndicator", 0x21, "B");

    output.addOutput("[Channel2]", "vu-18", 0x22, "B");
    output.addOutput("[Channel2]", "vu-12", 0x23, "B");
    output.addOutput("[Channel2]", "vu-6", 0x24, "B");
    output.addOutput("[Channel2]", "vu0", 0x25, "B");
    output.addOutput("[Channel2]", "vu6", 0x26, "B");
    output.addOutput("[Channel2]", "PeakIndicator", 0x27, "B");

    output.addOutput("[ChannelX]", "fxButton1", 0x16, "B");
    output.addOutput("[ChannelX]", "fxButton2", 0x17, "B");
    output.addOutput("[ChannelX]", "fxButton3", 0x18, "B");
    output.addOutput("[ChannelX]", "fxButton4", 0x19, "B");

    output.addOutput("[Channel1]", "MaximizeLibrary", 0x04, "B");
    output.addOutput("[Channel2]", "MaximizeLibrary", 0x2B, "B");

    output.addOutput("[ChannelX]", "quantize", 0x3C, "B");
    output.addOutput("[Microphone]", "talkover", 0x3D, "B");

    this.controller.registerOutputPacket(output);

    this.linkOutput("[Channel1]", "play_indicator", this.outputHandler);
    this.linkOutput("[Channel2]", "play_indicator", this.outputHandler);

    this.linkOutput("[Channel1]", "cue_indicator", this.outputHandler);
    this.linkOutput("[Channel2]", "cue_indicator", this.outputHandler);

    this.linkOutput("[Channel1]", "sync_enabled", this.outputHandler);
    this.linkOutput("[Channel2]", "sync_enabled", this.outputHandler);

    this.linkOutput("[Channel1]", "keylock", this.outputHandler);
    this.linkOutput("[Channel2]", "keylock", this.outputHandler);

    this.linkOutput("[Channel1]", "hotcue_1_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel1]", "hotcue_2_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel1]", "hotcue_3_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel1]", "hotcue_4_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel1]", "hotcue_5_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel1]", "hotcue_6_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel1]", "hotcue_7_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel1]", "hotcue_8_enabled", this.hotcueOutputHandler);

    this.linkOutput("[Channel2]", "hotcue_1_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel2]", "hotcue_2_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel2]", "hotcue_3_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel2]", "hotcue_4_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel2]", "hotcue_5_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel2]", "hotcue_6_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel2]", "hotcue_7_enabled", this.hotcueOutputHandler);
    this.linkOutput("[Channel2]", "hotcue_8_enabled", this.hotcueOutputHandler);

    this.linkOutput("[Channel1]", "pfl", this.outputHandler);
    this.linkOutput("[Channel2]", "pfl", this.outputHandler);

    this.linkOutput("[Microphone]", "talkover", this.outputHandler);

    // VuMeter
    this.vuLeftConnection = engine.makeConnection("[Channel1]", "VuMeter", this.vuMeterHandler);
    this.vuRightConnection = engine.makeConnection("[Channel2]", "VuMeter", this.vuMeterHandler);
    this.clipLeftConnection = engine.makeConnection("[Channel1]", "PeakIndicator", this.vuOutputHandler);
    this.clipRightConnection = engine.makeConnection("[Channel2]", "PeakIndicator", this.vuOutputHandler);

    // Sampler callbacks
    this.samplerCallbacks.push(engine.makeConnection("[Sampler1]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler2]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler3]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler4]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler5]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler6]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler7]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler8]", "track_loaded", this.samplesOutputHandler));

    this.samplerCallbacks.push(engine.makeConnection("[Sampler9]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler10]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler11]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler12]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler13]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler14]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler15]", "track_loaded", this.samplesOutputHandler));
    this.samplerCallbacks.push(engine.makeConnection("[Sampler16]", "track_loaded", this.samplesOutputHandler));

    TraktorS2MK3.lightDeck();
}

/* Helper function to link output in a short form */
TraktorS2MK3.linkOutput = function (group, name, callback) {
    TraktorS2MK3.controller.linkOutput(group, name, group, name, callback);
}

TraktorS2MK3.vuMeterHandler = function (value, group, key) {
    // TODO: Only send one packet for all LEDs
    for (var vuKey in TraktorS2MK3.vuMeterThresholds) {
        if (TraktorS2MK3.vuMeterThresholds[vuKey] > value) {
            TraktorS2MK3.vuOutputHandler(false, group, vuKey);
        } else {
            TraktorS2MK3.vuOutputHandler(true, group, vuKey);
        }
    }
}

TraktorS2MK3.vuOutputHandler = function (value, group, key) {
    var led_value = 0x00;
    if (value) {
        led_value = 0x7E;
    }

    TraktorS2MK3.controller.setOutput(group, key, led_value, true);
}

TraktorS2MK3.outputHandler = function (value, group, key) {
    var led_value = 0x7C;
    if (value) {
        led_value = 0x7E;
    }

    TraktorS2MK3.controller.setOutput(group, key, led_value, true);
}

TraktorS2MK3.hotcueOutputHandler = function (value, group, key) {
    if (TraktorS2MK3.padModeState[group] === 0) {
        TraktorS2MK3.outputHandler(value, group, key);
    }
}

TraktorS2MK3.samplesOutputHandler = function (value, group, key) {
    // Sampler 1-4, 9-12 -> Channel1
    // Samples 5-8, 13-16 -> Channel2
    var sampler = TraktorS2MK3.resolveSampler(group);
    if (sampler > 0 && sampler < 5) {
        var deck = "[Channel1]";
        var num = sampler;
    }
    else if (sampler > 4 && sampler < 9) {
        var deck = "[Channel2]";
        var num = sampler - 4;
    } else if (sampler > 8 && sampler < 13) {
        var deck = "[Channel1]";
        var num = sampler - 4;
    } else if (sampler > 12 && sampler < 17) {
        var deck = "[Channel2]";
        var num = sampler - 8;
    }

    // If we are in samples modes light corresponding LED
    if (TraktorS2MK3.padModeState[deck] === 1) {
        TraktorS2MK3.outputHandler(value, deck, "hotcue_" + num + "_enabled");
    }
}

TraktorS2MK3.resolveSampler = function (group) {
    if (group == undefined)
        return undefined;
    var result = group.match(/\[Sampler[0-9]+\]/);
    if (!result)
        return undefined;
    var str = group.replace(/\[Sampler/, "");
    return str.substring(0, str.length - 1);
}

TraktorS2MK3.lightDeck = function () {

    TraktorS2MK3.controller.setOutput("[Channel1]", "play_indicator", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "play_indicator", 0x7C, false);

    TraktorS2MK3.controller.setOutput("[Channel1]", "cue_indicator", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "cue_indicator", 0x7C, false);

    TraktorS2MK3.controller.setOutput("[Channel1]", "shift", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "shift", 0x7C, false);

    TraktorS2MK3.controller.setOutput("[Channel1]", "sync_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "sync_enabled", 0x7C, false);

    // Hotcues mode is default start value
    TraktorS2MK3.controller.setOutput("[Channel1]", "hotcues", 0x7E, false);
    TraktorS2MK3.controller.setOutput("[Channel1]", "samples", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "hotcues", 0x7E, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "samples", 0x7C, false);

    TraktorS2MK3.controller.setOutput("[Channel1]", "keylock", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "keylock", 0x7C, false);

    TraktorS2MK3.controller.setOutput("[Channel1]", "hotcue_1_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel1]", "hotcue_2_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel1]", "hotcue_3_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel1]", "hotcue_4_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel1]", "hotcue_5_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel1]", "hotcue_6_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel1]", "hotcue_7_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel1]", "hotcue_8_enabled", 0x7C, false);

    TraktorS2MK3.controller.setOutput("[Channel2]", "hotcue_1_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "hotcue_2_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "hotcue_3_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "hotcue_4_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "hotcue_5_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "hotcue_6_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "hotcue_7_enabled", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "hotcue_8_enabled", 0x7C, false);

    TraktorS2MK3.controller.setOutput("[Channel1]", "pfl", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "pfl", 0x7C, false);

    TraktorS2MK3.controller.setOutput("[ChannelX]", "fxButton1", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[ChannelX]", "fxButton2", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[ChannelX]", "fxButton3", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[ChannelX]", "fxButton4", 0x7C, false);

    TraktorS2MK3.controller.setOutput("[Channel1]", "MaximizeLibrary", 0x7C, false);
    TraktorS2MK3.controller.setOutput("[Channel2]", "MaximizeLibrary", 0x7C, false);

    TraktorS2MK3.controller.setOutput("[ChannelX]", "quantize", 0x7C, false);

    // For the last output we should send the packet finally
    TraktorS2MK3.controller.setOutput("[Microphone]", "talkover", 0x7C, true);
}

TraktorS2MK3.messageCallback = function (packet, data) {
    for (name in data) {
        field = data[name];
        HIDDebug("TraktorS2MK3: messageCallback - field: " + name);
        TraktorS2MK3.controller.processButton(field);
    }
}

TraktorS2MK3.shutdown = function () {

    // Disconnect VuMeter callbacks
    this.vuLeftConnection.disconnect();
    this.vuRightConnection.disconnect();
    this.clipLeftConnection.disconnect();
    this.clipRightConnection.disconnect();

    // Disconnect Sampler callbacks
    this.samplerCallbacks.forEach(function (item) {
        item.disconnect();
    });

    // Deactivate all LEDs
    var data_string = "00 00 00  00 00 00 00  00 00 00 00  00 00 00 00 \n" +
        "00 00 00 00  00 00 00 00  00 00 00 00  00 00 00 00 \n" +
        "00 00 00 00  00 00 00 00  00 00 00 00  00 00 00 00 \n" +
        "00 00 00 00  00 00 00 00  00 00 00 00  00 00";
    this.rawOutput(data_string);

    HIDDebug("TraktorS2MK3: Shutdown done!");
}

TraktorS2MK3.incomingData = function (data, length) {
    TraktorS2MK3.controller.parsePacket(data, length);
}

/* Helper function to convert a string into raw bytes */
TraktorS2MK3.toBytes = function (data_string) {
    var data = Object();
    var ok = true;
    var splitted = data_string.split(/\s+/);
    data.length = splitted.length;
    for (j = 0; j < splitted.length; j++) {
        var byte_str = splitted[j];
        if (byte_str.length !== 2) {
            ok = false;
            HIDDebug("not two characters?? " + byte_str);
        }
        var b = parseInt(byte_str, 16);
        if (b < 0 || b > 255) {
            HIDDebug("number out of range: " + byte_str + " " + b);
            return {};
        }
        data[j] = b;
    }

    return data;
}

/* Helper function to send a binary string to the controller */
TraktorS2MK3.rawOutput = function (data_string) {
    HIDDebug("TraktorS2MK3: Send raw output to controller ...");
    var data = TraktorS2MK3.toBytes(data_string);
    controller.send(data, data.length, 0x80);
}

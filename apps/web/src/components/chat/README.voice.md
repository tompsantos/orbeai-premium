# Voice conversation frontend contract

The new voice surface is intentionally provider-agnostic and is ready to receive a realtime audio transport.

Expected integration points:

- microphone capture and voice activity detection;
- bidirectional audio streaming;
- partial and final transcript events;
- assistant thinking and speaking state events;
- interruption and barge-in;
- mute, captions, output and session controls;
- transcript handoff to the regular chat composer.

The current implementation is a frontend shell only. It does not request microphone permission or transmit audio until a realtime voice service is connected.

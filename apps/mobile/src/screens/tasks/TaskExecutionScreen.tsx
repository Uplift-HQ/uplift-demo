import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CameraIcon, CheckSquareIcon, ClockIcon, FileTextIcon, UploadIcon, CheckCircleIcon, XCircleIcon, XIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';

export const TaskExecutionScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const task = route?.params?.task || {};
  const [completedSubtasks, setCompletedSubtasks] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [signature, setSignature] = useState('');
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureInput, setSignatureInput] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSubtask = (subtaskId: string) => {
    if (completedSubtasks.includes(subtaskId)) {
      setCompletedSubtasks(completedSubtasks.filter(id => id !== subtaskId));
    } else {
      setCompletedSubtasks([...completedSubtasks, subtaskId]);
    }
  };

  const handleTakePhoto = () => {
    showAlert(
      t('screens.taskExecution.capture_photo'),
      t('screens.taskExecution.choose_photo_source'),
      [
        {
          text: t('screens.taskExecution.camera'),
          onPress: () => {
            // Simulate photo capture
            setPhotos([...photos, `photo_${Date.now()}.jpg`]);
            showAlert(t('common.success'), t('screens.taskExecution.photo_captured'));
          }
        },
        {
          text: t('screens.taskExecution.gallery'),
          onPress: () => {
            // Simulate photo selection
            setPhotos([...photos, `gallery_${Date.now()}.jpg`]);
            showAlert(t('common.success'), t('screens.taskExecution.photo_captured'));
          }
        },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    );
  };

  const handleAttachFile = () => {
    showAlert(t('screens.taskExecution.attach_file'), t('screens.taskExecution.file_picker_hint'), [
      {
        text: t('screens.taskExecution.select_file'),
        onPress: () => {
          setFiles([...files, `document_${Date.now()}.pdf`]);
          showAlert(t('common.success'), t('screens.taskExecution.file_attached'));
        }
      },
      { text: t('common.cancel'), style: 'cancel' }
    ]);
  };

  const handleAddSignature = () => {
    setSignatureInput('');
    setShowSignatureModal(true);
  };

  const confirmSignature = () => {
    if (signatureInput.trim()) {
      setSignature(signatureInput.trim());
      setShowSignatureModal(false);
      showAlert(t('common.success'), t('screens.taskExecution.signature_added'));
    }
  };

  const handleSubmit = () => {
    const allSubtasksComplete = task.subtasks?.every((st: any) =>
      completedSubtasks.includes(st.id)
    ) ?? true;

    if (!allSubtasksComplete) {
      showAlert(t('screens.taskExecution.incomplete'), t('screens.taskExecution.complete_all_steps'));
      return;
    }

    if (task.requiresProof && photos.length === 0 && files.length === 0) {
      showAlert(t('screens.taskExecution.proof_required'), t('screens.taskExecution.attach_proof_message'));
      return;
    }

    showAlert(
      t('screens.taskExecution.submit_task'),
      t('screens.taskExecution.submit_for_review_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.submit'),
          onPress: () => {
            setIsRunning(false);
            navigation.navigate('TaskCompletion', {
              task,
              timeSpent: timer,
              photos: photos.length,
              files: files.length,
            });
          }
        }
      ]
    );
  };

  const progress = task.subtasks ? (completedSubtasks.length / task.subtasks.length) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          showAlert(
            t('screens.taskExecution.exit_task'),
            t('screens.taskExecution.progress_saved'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('screens.taskExecution.exit'), onPress: () => navigation.goBack() }
            ]
          );
        }}>
          <Text style={styles.backButton}>{t('screens.taskExecution.back_exit')}</Text>
        </TouchableOpacity>
        <View style={styles.timerBadge}>
          <ClockIcon size={16} color={colors.momentum} />
          <Text style={styles.timerText}>{formatTime(timer)}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Header */}
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {t('screens.taskExecution.steps_completed', { done: completedSubtasks.length, total: task.subtasks?.length || 0 })}
          </Text>
        </View>

        {/* Subtasks Checklist */}
        {task.subtasks && task.subtasks.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <CheckSquareIcon size={20} color={colors.slate700} />
              <Text style={styles.cardTitle}>{t('screens.taskExecution.task_steps')}</Text>
            </View>

            {task.subtasks.map((subtask: any, index: number) => (
              <TouchableOpacity
                key={subtask.id}
                style={styles.subtaskItem}
                onPress={() => toggleSubtask(subtask.id)}
              >
                <View style={[
                  styles.subtaskCheckbox,
                  completedSubtasks.includes(subtask.id) && styles.subtaskCheckboxCompleted
                ]}>
                  {completedSubtasks.includes(subtask.id) && (
                    <CheckCircleIcon size={18} color={colors.background} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.subtaskText,
                    completedSubtasks.includes(subtask.id) && styles.subtaskTextCompleted
                  ]}>
                    {subtask.title}
                  </Text>
                </View>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Photo Attachments */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CameraIcon size={20} color={colors.slate700} />
            <Text style={styles.cardTitle}>{t('screens.taskExecution.photo_evidence')}</Text>
            {task.requiresProof && (
              <Text style={styles.requiredBadge}>{t('common.required')}</Text>
            )}
          </View>

          {photos.length > 0 && (
            <View style={styles.attachmentsList}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <CameraIcon size={16} color={colors.info} />
                  <Text style={styles.attachmentName}>{photo}</Text>
                  <TouchableOpacity onPress={() => setPhotos(photos.filter((_, i) => i !== index))}>
                    <XCircleIcon size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.attachButton} onPress={handleTakePhoto}>
            <CameraIcon size={20} color={colors.momentum} />
            <Text style={styles.attachButtonText}>{t('tasks.takePhoto')}</Text>
          </TouchableOpacity>
        </View>

        {/* File Attachments */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <UploadIcon size={20} color={colors.slate700} />
            <Text style={styles.cardTitle}>{t('screens.taskExecution.file_attachments')}</Text>
          </View>

          {files.length > 0 && (
            <View style={styles.attachmentsList}>
              {files.map((file, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <FileTextIcon size={16} color={colors.warning} />
                  <Text style={styles.attachmentName}>{file}</Text>
                  <TouchableOpacity onPress={() => setFiles(files.filter((_, i) => i !== index))}>
                    <XCircleIcon size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.attachButton} onPress={handleAttachFile}>
            <UploadIcon size={20} color={colors.momentum} />
            <Text style={styles.attachButtonText}>{t('screens.taskExecution.attach_file')}</Text>
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileTextIcon size={20} color={colors.slate700} />
            <Text style={styles.cardTitle}>{t('screens.taskExecution.notes')}</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder={t('screens.taskExecution.notes_placeholder')}
            placeholderTextColor={colors.slate400}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Signature */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileTextIcon size={20} color={colors.slate700} />
            <Text style={styles.cardTitle}>{t('screens.taskExecution.signature')}</Text>
          </View>

          {signature ? (
            <View style={styles.signatureBox}>
              <Text style={styles.signatureText}>{signature}</Text>
              <TouchableOpacity
                style={styles.clearSignatureButton}
                onPress={() => setSignature('')}
              >
                <Text style={styles.clearSignatureText}>{t('common.clear')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.signatureButton} onPress={handleAddSignature}>
              <Text style={styles.signatureButtonText}>{t('screens.taskExecution.add_signature')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            !completedSubtasks.length && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!completedSubtasks.length}
        >
          <CheckCircleIcon size={24} color={colors.background} />
          <Text style={styles.submitButtonText}>{t('screens.taskExecution.submit_for_review')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Signature Modal */}
      <Modal visible={showSignatureModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('screens.taskExecution.add_signature')}</Text>
              <TouchableOpacity onPress={() => setShowSignatureModal(false)}>
                <XIcon size={24} color={colors.slate700} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>{t('screens.taskExecution.type_name_to_sign')}</Text>
              <TextInput
                style={styles.modalInput}
                value={signatureInput}
                onChangeText={setSignatureInput}
                placeholder={t('screens.taskExecution.enter_full_name')}
                placeholderTextColor={colors.slate400}
                autoFocus
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowSignatureModal(false)}
                >
                  <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, !signatureInput.trim() && styles.modalButtonDisabled]}
                  onPress={confirmSignature}
                  disabled={!signatureInput.trim()}
                >
                  <Text style={styles.modalConfirmText}>{t('screens.taskExecution.sign')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.background, ...shadows.sm },
  backButton: { ...typography.bodyBold, color: colors.momentum },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.momentum + '20', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.full },
  timerText: { ...typography.h3, color: colors.momentum, fontWeight: '700', fontSize: 18 },
  
  content: { flex: 1 },
  taskHeader: { backgroundColor: colors.background, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.sm },
  taskTitle: { ...typography.h2, color: colors.slate900, marginBottom: spacing.md },
  progressBar: { height: 8, backgroundColor: colors.slate200, borderRadius: 4, marginBottom: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.momentum, borderRadius: 4 },
  progressText: { ...typography.caption, color: colors.slate600 },
  
  card: { backgroundColor: colors.background, marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  cardTitle: { ...typography.h3, color: colors.slate900, flex: 1 },
  requiredBadge: { ...typography.caption, color: colors.error, fontWeight: '700', backgroundColor: colors.error + '15', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  
  subtaskItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  subtaskCheckbox: { width: 28, height: 28, borderWidth: 2, borderColor: colors.slate300, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  subtaskCheckboxCompleted: { backgroundColor: colors.success, borderColor: colors.success },
  subtaskText: { ...typography.body, color: colors.slate900, flex: 1 },
  subtaskTextCompleted: { color: colors.slate500, textDecorationLine: 'line-through' },
  stepNumber: { width: 24, height: 24, backgroundColor: colors.slate200, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { ...typography.caption, color: colors.slate700, fontWeight: '700', fontSize: 12 },
  
  attachmentsList: { marginBottom: spacing.md },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.slate100, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  attachmentName: { ...typography.body, color: colors.slate700, flex: 1 },
  attachButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum + '15', paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 2, borderColor: colors.momentum, borderStyle: 'dashed' },
  attachButtonText: { ...typography.bodyBold, color: colors.momentum },
  
  notesInput: { ...typography.body, color: colors.slate900, backgroundColor: colors.slate50, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.slate200, minHeight: 100, textAlignVertical: 'top' },
  
  signatureBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.slate50, padding: spacing.lg, borderRadius: borderRadius.md, borderWidth: 2, borderColor: colors.success },
  signatureText: { ...typography.h3, color: colors.slate900, fontStyle: 'italic' },
  clearSignatureButton: { backgroundColor: colors.error + '15', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  clearSignatureText: { ...typography.caption, color: colors.error, fontWeight: '700' },
  signatureButton: { backgroundColor: colors.slate100, paddingVertical: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 2, borderColor: colors.slate300, borderStyle: 'dashed' },
  signatureButtonText: { ...typography.bodyBold, color: colors.slate700 },
  
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, marginHorizontal: spacing.lg, marginBottom: spacing.xl, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, ...shadows.lg },
  submitButtonDisabled: { backgroundColor: colors.slate300 },
  submitButtonText: { ...typography.h3, color: colors.background },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.background, borderRadius: borderRadius.xl, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  modalTitle: { ...typography.h2, color: colors.slate900, fontSize: 18 },
  modalBody: { padding: spacing.lg },
  modalLabel: { ...typography.body, color: colors.slate600, marginBottom: spacing.md },
  modalInput: { ...typography.body, color: colors.slate900, backgroundColor: colors.slate50, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.slate200 },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  modalCancelButton: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.slate200, alignItems: 'center' },
  modalCancelText: { ...typography.bodyBold, color: colors.slate700 },
  modalConfirmButton: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.momentum, alignItems: 'center' },
  modalConfirmText: { ...typography.bodyBold, color: colors.background },
  modalButtonDisabled: { backgroundColor: colors.slate300 },
});

import mongoose from 'mongoose';

const organizerApplicationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required']
        },
        organizationName: {
            type: String,
            required: [true, 'Organization name is required'],
            trim: true
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'approved', 'rejected'],
                message: '{VALUE} is not a valid status'
            },
            default: 'pending'
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        reviewNotes: {
            type: String,
            default: null,
            trim: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

organizerApplicationSchema.index({ user: 1, status: 1 });
organizerApplicationSchema.index(
    { user: 1 },
    {
        unique: true,
        partialFilterExpression: { status: 'pending' },
        name: 'one_pending_organizer_application_per_user'
    }
);

export const organizerApplicationModel = mongoose.model('OrganizerApplication', organizerApplicationSchema);
export default organizerApplicationModel;
